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

export type Agrupamento = 'cliente' | 'ambiente';
export const AMBIENTE_VARIOS = 'Vários ambientes';

type ConfigGeracao = { equipamentoId: string; equipamentoNome: string; ambienteId: string; ambienteNome: string };

/**
 * Divide os equipamentos pendentes de uma visita em O.S. Ordena por ambiente e nome para manter as salas
 * juntas; com limite, divide em partes de tamanho parecido (ex.: 40 com limite 30 → 20 + 20).
 */
export function montarGrupos<T extends ConfigGeracao>(configs: T[], modo: Agrupamento, max?: number | null): T[][] {
  const ord = [...configs].sort((a, b) =>
    a.ambienteNome.localeCompare(b.ambienteNome, 'pt-BR', { numeric: true }) ||
    a.equipamentoNome.localeCompare(b.equipamentoNome, 'pt-BR', { numeric: true }));
  let blocos: T[][];
  if (modo === 'ambiente') {
    const m = new Map<string, T[]>();
    for (const c of ord) m.set(c.ambienteId, [...(m.get(c.ambienteId) ?? []), c]);
    blocos = [...m.values()];
  } else {
    blocos = ord.length ? [ord] : [];
  }
  if (!max || max < 1) return blocos;
  return blocos.flatMap((b) => {
    const partes = Math.ceil(b.length / max);
    const tam = Math.ceil(b.length / partes);
    return Array.from({ length: partes }, (_, i) => b.slice(i * tam, (i + 1) * tam));
  });
}

/** Ambiente "Vários ambientes" do cliente, para O.S. de visita que cobre mais de um ambiente. */
async function ambienteVarios(prisma: PrismaService, clienteId: string, empresaId: string | null): Promise<string> {
  const existente = await prisma.ambiente.findFirst({
    where: { clienteId, nome: AMBIENTE_VARIOS, deletedAt: null },
    select: { id: true },
  });
  if (existente) return existente.id;
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { endereco: true } });
  const novo = await prisma.ambiente.create({
    data: {
      clienteId,
      nome: AMBIENTE_VARIOS,
      localizacaoInterna: cliente?.endereco || AMBIENTE_VARIOS,
      metrosQuadrados: 0,
      capacidadeTermica: 'A definir',
      empresaId: empresaId ?? undefined,
    },
    select: { id: true },
  });
  return novo.id;
}

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
 * Gera as O.S. preventivas de um plano. Em cada visita, agrupa os equipamentos conforme o
 * agrupamento (plano ou padrão da empresa): por CLIENTE = uma O.S. e um evento na agenda com todos
 * os equipamentos (visitas grandes podem ser divididas por maxEquipamentosPorOs); por AMBIENTE =
 * uma O.S. por ambiente. Cada equipamento é um item com checklist próprio. Idempotente: não
 * recria equipamento que já tem O.S. do plano naquela data.
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
    ambienteNome: c.equipamento.ambiente.nome,
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

  // Como agrupar: o plano manda; se não definir, vale o padrão da empresa (padrão do produto: cliente)
  const empresa = await prisma.configuracaoEmpresa.findFirst({
    where: plano.empresaId ? { empresaId: plano.empresaId } : {},
    select: { agrupamentoOsPadrao: true },
  });
  const modo: Agrupamento = plano.agrupamento === 'ambiente' || plano.agrupamento === 'cliente'
    ? plano.agrupamento
    : empresa?.agrupamentoOsPadrao === 'ambiente' ? 'ambiente' : 'cliente';

  let geradas = 0;
  let ambienteVariosId: string | null = null;

  for (const dataGeracao of datas) {
    // Idempotência: equipamentos que já têm O.S. do plano nesta data (inclusive O.S. antigas) não entram de novo
    const existentes = await prisma.ordemServicoItem.findMany({
      where: { ordemServico: { planoId: plano.id, dataAgendamento: dataGeracao } },
      select: { equipamentoId: true },
    });
    const jaTem = new Set(existentes.map((e) => e.equipamentoId));
    const pendentes = configs.filter((c) => !jaTem.has(c.equipamentoId));

    for (const grupo of montarGrupos(pendentes, modo, plano.maxEquipamentosPorOs)) {
      const ambientes = new Set(grupo.map((c) => c.ambienteId));
      let ambienteId: string;
      if (ambientes.size === 1) {
        ambienteId = grupo[0].ambienteId;
      } else {
        ambienteVariosId ??= await ambienteVarios(prisma, plano.clienteId, plano.empresaId);
        ambienteId = ambienteVariosId;
      }

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
            horaInicio: plano.horaInicio,
            horaFim: plano.horaFim,
            empresaId: plano.empresaId ?? undefined,
          },
          select: { id: true },
        });

        await tx.ordemServicoItem.createMany({
          data: grupo.map((c) => ({
            ordemServicoId: created.id,
            equipamentoId: c.equipamentoId,
            statusItem: 'pendente' as const,
            checklistSnapshot: c.snapshot,
          })),
        });
        return created.id;
      });

      // Evento na agenda do Orbitalis: um por O.S. (uma visita = um evento)
      await agenda.sincronizarOs(osId);
      geradas++;
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
    `Plano ${plano.id}: ${datas.length} visita(s), agrupamento por ${modo}, ${geradas} O.S. nova(s)${esgotado ? ' [CONCLUÍDO]' : ''}`,
  );
  return { geradas, ciclos: datas.length, semCiclos: false, esgotado };
}
