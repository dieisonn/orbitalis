import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolverChecklistItens } from '../../common/checklist-resolver';
import { PrismaService } from '../../prisma/prisma.service';
import { AgendaService } from '../agenda/agenda.service';

// Planos elegíveis para geração, com tudo que a geração precisa (ignora excluídos — soft delete)
export const INCLUDE_GERACAO = {
  tipoServico: { select: { id: true, sigla: true } },
  tecnico: { select: { id: true, nome: true } },
  equipamentosConfig: {
    where: { equipamento: { deletedAt: null, ambiente: { deletedAt: null, cliente: { deletedAt: null } } } },
    include: {
      equipamento: {
        select: {
          id: true,
          ambienteId: true,
          nome: true,
          ambiente: {
            select: { id: true, nome: true, cliente: { select: { razaoSocial: true, telefone: true } } },
          },
        },
      },
      modeloChecklist: true,
    },
  },
} satisfies Prisma.PlanoManutencaoInclude;

export type PlanoParaGerar = Prisma.PlanoManutencaoGetPayload<{ include: typeof INCLUDE_GERACAO }>;

function somarMesesUTC(base: Date, meses: number): Date {
  const r = new Date(base);
  const dia = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(dia, ultimoDia));
  return r;
}

/**
 * Meses de cada ciclo. As frequências padrão (30/60/90/180/365 dias) são mensal, bimestral,
 * trimestral, semestral e anual: andam por MÊS DE CALENDÁRIO (um plano mensal de 12 meses
 * gera 12 visitas, e não 13 por passos de 30 dias). Outros valores seguem em dias corridos.
 */
export function mesesDoCiclo(frequenciaDias: number): number | null {
  if (frequenciaDias === 365) return 12;
  if (frequenciaDias >= 30 && frequenciaDias <= 360 && frequenciaDias % 30 === 0) return frequenciaDias / 30;
  return null;
}

/** Data da n-ésima ocorrência a partir de `inicio` (n = 0 é o próprio início). */
export function dataDoCiclo(inicio: Date, frequenciaDias: number, n: number): Date {
  const meses = mesesDoCiclo(frequenciaDias);
  return meses !== null
    ? somarMesesUTC(inicio, meses * n)
    : new Date(inicio.getTime() + frequenciaDias * n * 86_400_000);
}

/** Visitas que ainda cabem no plano (Infinity = plano antigo, sem limite de visitas). */
export function visitasRestantes(plano: { visitasPrevistas?: number | null; visitasGeradas?: number | null }): number {
  return plano.visitasPrevistas == null ? Infinity : Math.max(0, plano.visitasPrevistas - (plano.visitasGeradas ?? 0));
}

/**
 * Datas a gerar agora: as que cabem até dataFim, sem passar das visitas incluídas no plano;
 * sem dataFim, só a próxima.
 */
export function datasParaGerar(plano: {
  proximaGeracao: Date;
  dataFim: Date | null;
  frequenciaDias: number;
  visitasPrevistas?: number | null;
  visitasGeradas?: number | null;
}): Date[] {
  const restantes = visitasRestantes(plano);
  if (restantes <= 0) return [];
  if (!plano.dataFim) return [new Date(plano.proximaGeracao)];
  const datas: Date[] = [];
  for (let n = 0; n < restantes; n++) {
    const d = dataDoCiclo(plano.proximaGeracao, plano.frequenciaDias, n);
    if (d > plano.dataFim) break;
    datas.push(d);
  }
  return datas;
}

export type ResultadoPlano = { geradas: number; ciclos: number; semCiclos: boolean; esgotado: boolean };

/**
 * Gera as O.S. preventivas de um plano. Uma O.S. por AMBIENTE em cada visita, com um item
 * por equipamento do ambiente (o técnico faz uma visita, abre uma O.S.). Idempotente: não
 * recria equipamento que já tem O.S. do plano naquela data (inclusive O.S. antigas, que
 * eram uma por equipamento).
 */
export async function gerarOsDoPlano(
  prisma: PrismaService,
  agenda: AgendaService,
  logger: Logger,
  plano: PlanoParaGerar,
): Promise<ResultadoPlano> {
  // Checklist padrão para equipamentos sem modelo próprio: preventiva + tipo de serviço do plano
  const checklistPadrao = await resolverChecklistItens(prisma, {
    tipo: 'preventiva',
    tipoServicoId: plano.tipoServicoId,
  });

  const configs = plano.equipamentosConfig.map((c) => ({
    equipamentoId: c.equipamentoId,
    equipamentoNome: c.equipamento.nome,
    ambienteId: c.equipamento.ambienteId,
    clienteNome: c.equipamento.ambiente.cliente.razaoSocial,
    clienteTelefone: c.equipamento.ambiente.cliente.telefone,
    snapshot: c.modeloChecklist
      ? (JSON.parse(JSON.stringify(c.modeloChecklist.itens)) as Prisma.InputJsonValue)
      : checklistPadrao,
  }));

  const datas = datasParaGerar(plano);
  if (datas.length === 0) {
    // Nenhum ciclo cabe mais dentro do prazo → encerra o plano
    await prisma.planoManutencao.update({ where: { id: plano.id }, data: { ativo: false } });
    logger.log(`Plano ${plano.id}: sem ciclos restantes — marcado como concluído`);
    return { geradas: 0, ciclos: 0, semCiclos: true, esgotado: true };
  }

  const porAmbiente = new Map<string, typeof configs>();
  for (const c of configs) porAmbiente.set(c.ambienteId, [...(porAmbiente.get(c.ambienteId) ?? []), c]);

  let geradas = 0;

  for (const dataGeracao of datas) {
    let novasNaData = 0;

    for (const [ambienteId, doAmbiente] of porAmbiente) {
      // Idempotência: só entram na O.S. os equipamentos que ainda não têm O.S. do plano nesta data
      const pendentes: typeof doAmbiente = [];
      for (const config of doAmbiente) {
        const jaExiste = await prisma.ordemServico.findFirst({
          where: {
            planoId: plano.id,
            dataAgendamento: dataGeracao,
            itens: { some: { equipamentoId: config.equipamentoId } },
          },
          select: { id: true },
        });
        if (!jaExiste) pendentes.push(config);
      }
      if (pendentes.length === 0) continue;

      const osId = await prisma.$transaction(async (tx) => {
        const created = await tx.ordemServico.create({
          data: {
            ambienteId,
            planoId: plano.id,
            tecnicoId: plano.tecnicoId,
            tipoServicoId: plano.tipoServicoId,
            status: 'agendada',
            tipo: 'preventiva',
            origem: 'preventiva_automatica',
            dataAgendamento: dataGeracao,
            empresaId: plano.empresaId ?? undefined,
          },
          select: { id: true },
        });

        await tx.ordemServicoItem.createMany({
          data: pendentes.map((c) => ({
            ordemServicoId: created.id,
            equipamentoId: c.equipamentoId,
            statusItem: 'pendente' as const,
            checklistSnapshot: c.snapshot,
          })),
        });
        return created.id;
      });

      // Evento na agenda do Orbitalis: título, endereço e duração vêm do tipo de serviço
      await agenda.sincronizarOs(osId);

      geradas++;
      novasNaData++;
    }
  }

  const ultimaData = datas[datas.length - 1];
  const proximaGeracao = dataDoCiclo(ultimaData, plano.frequenciaDias, 1);
  const geradasNoPlano = (plano.visitasGeradas ?? 0) + datas.length;
  const esgotado =
    (plano.dataFim ? proximaGeracao > plano.dataFim : false) ||
    (plano.visitasPrevistas != null && geradasNoPlano >= plano.visitasPrevistas);

  await prisma.planoManutencao.update({
    where: { id: plano.id },
    data: {
      ultimaGeracao: ultimaData,
      proximaGeracao,
      visitasGeradas: geradasNoPlano,
      ...(esgotado ? { ativo: false } : {}),
    },
  });

  logger.log(
    `Plano ${plano.id}: ${datas.length} visita(s) × ${porAmbiente.size} ambiente(s), ${geradas} O.S. nova(s)${esgotado ? ' [CONCLUÍDO]' : ''}`,
  );
  return { geradas, ciclos: datas.length, semCiclos: false, esgotado };
}
