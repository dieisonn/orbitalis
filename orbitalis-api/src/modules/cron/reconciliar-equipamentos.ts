import { Prisma } from '@prisma/client';
import { resolverChecklistItens } from '../../common/checklist-resolver';
import { PrismaService } from '../../prisma/prisma.service';
import { AgendaService } from '../agenda/agenda.service';
import { ambienteVarios, type Agrupamento } from './geracao-preventiva';

// O.S. ainda não executadas — só estas são ajustadas; o que já foi feito é histórico e não muda
const STATUS_AJUSTAVEIS = ['agendada', 'aberta'] as const;

export type ResumoReconciliacao = {
  itensRemovidos: number;
  osExcluidas: number;
  osAjustadas: number;
  itensIncluidos: number;
  osCriadas: number;
  planosEncerrados: number;
};

export const resumoVazio = (): ResumoReconciliacao => ({
  itensRemovidos: 0, osExcluidas: 0, osAjustadas: 0, itensIncluidos: 0, osCriadas: 0, planosEncerrados: 0,
});

/**
 * Equipamento saiu do contrato/plano (vendido, perdido, excluído): tira dos planos e das O.S.
 * futuras ainda não executadas. O.S. que ficam sem nenhum equipamento são excluídas (com o evento
 * da agenda); as demais são mantidas e reajustadas. `planoIds` limita a certos planos.
 */
export async function removerEquipamentoDosPlanos(
  prisma: PrismaService,
  agenda: AgendaService,
  equipamentoId: string,
  planoIds?: string[],
): Promise<ResumoReconciliacao> {
  const r = resumoVazio();
  const filtroPlano = planoIds ? { in: planoIds } : { not: null };

  const itens = await prisma.ordemServicoItem.findMany({
    where: {
      equipamentoId,
      statusItem: 'pendente',
      ordemServico: { planoId: filtroPlano, status: { in: [...STATUS_AJUSTAVEIS] }, origem: 'preventiva_automatica' },
    },
    select: { id: true, ordemServicoId: true },
  });

  if (itens.length) {
    await prisma.ordemServicoItem.deleteMany({ where: { id: { in: itens.map((i) => i.id) } } });
    r.itensRemovidos = itens.length;
    for (const osId of new Set(itens.map((i) => i.ordemServicoId))) {
      const restantes = await prisma.ordemServicoItem.count({ where: { ordemServicoId: osId } });
      if (restantes === 0) {
        await prisma.ordemServico.delete({ where: { id: osId } }); // eventos da agenda saem em cascata
        r.osExcluidas++;
      } else {
        await agenda.sincronizarOs(osId);
        r.osAjustadas++;
      }
    }
  }

  const configs = await prisma.planoEquipamentoConfig.findMany({
    where: { equipamentoId, ...(planoIds ? { planoId: { in: planoIds } } : {}) },
    select: { planoId: true },
  });
  if (configs.length) {
    await prisma.planoEquipamentoConfig.deleteMany({
      where: { equipamentoId, planoId: { in: configs.map((c) => c.planoId) } },
    });
    // Plano sem nenhum equipamento deixa de gerar visitas
    for (const planoId of new Set(configs.map((c) => c.planoId))) {
      const sobrou = await prisma.planoEquipamentoConfig.count({ where: { planoId } });
      if (sobrou === 0) {
        const p = await prisma.planoManutencao.updateMany({ where: { id: planoId, ativo: true }, data: { ativo: false } });
        r.planosEncerrados += p.count;
      }
    }
  }
  return r;
}

/**
 * Equipamento novo (ou comprado) entra em planos ativos do cliente: vira config do plano e entra
 * nas O.S. futuras ainda não executadas, respeitando o agrupamento e o máximo por O.S. do plano.
 */
export async function incluirEquipamentoNosPlanos(
  prisma: PrismaService,
  agenda: AgendaService,
  equipamentoId: string,
  planoIds: string[],
): Promise<ResumoReconciliacao> {
  const r = resumoVazio();
  if (!planoIds.length) return r;

  const eq = await prisma.equipamento.findFirst({
    where: { id: equipamentoId, deletedAt: null },
    select: { id: true, ambienteId: true, nome: true, ambiente: { select: { clienteId: true, nome: true } } },
  });
  if (!eq) return r;

  const planos = await prisma.planoManutencao.findMany({
    where: { id: { in: planoIds }, clienteId: eq.ambiente.clienteId },
  });
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  for (const plano of planos) {
    await prisma.planoEquipamentoConfig.upsert({
      where: { planoId_equipamentoId: { planoId: plano.id, equipamentoId } },
      create: { planoId: plano.id, equipamentoId },
      update: {},
    });
    // Plano que tinha ficado sem equipamentos volta a valer, se ainda tem visitas a gerar
    if (!plano.ativo && (plano.visitasPrevistas == null || (plano.visitasGeradas ?? 0) < plano.visitasPrevistas)
        && (!plano.dataFim || plano.proximaGeracao <= plano.dataFim)) {
      await prisma.planoManutencao.update({ where: { id: plano.id }, data: { ativo: true } });
    }

    const snapshot = (await resolverChecklistItens(prisma, {
      tipo: 'preventiva',
      tipoServicoId: plano.tipoServicoId,
    })) as Prisma.InputJsonValue;

    const empresa = await prisma.configuracaoEmpresa.findFirst({
      where: plano.empresaId ? { empresaId: plano.empresaId } : {},
      select: { agrupamentoOsPadrao: true },
    });
    const modo: Agrupamento = plano.agrupamento === 'ambiente' || plano.agrupamento === 'cliente'
      ? plano.agrupamento
      : empresa?.agrupamentoOsPadrao === 'ambiente' ? 'ambiente' : 'cliente';

    const futuras = await prisma.ordemServico.findMany({
      where: {
        planoId: plano.id,
        origem: 'preventiva_automatica',
        status: { in: [...STATUS_AJUSTAVEIS] },
        dataAgendamento: { gte: hoje },
      },
      orderBy: { dataAgendamento: 'asc' },
      select: { id: true, ambienteId: true, dataAgendamento: true, itens: { select: { equipamentoId: true, equipamento: { select: { ambienteId: true } } } } },
    });

    const porData = new Map<number, typeof futuras>();
    for (const os of futuras) {
      const k = os.dataAgendamento.getTime();
      porData.set(k, [...(porData.get(k) ?? []), os]);
    }

    for (const [, osDoDia] of porData) {
      if (osDoDia.some((o) => o.itens.some((i) => i.equipamentoId === equipamentoId))) continue;
      const cabe = osDoDia.filter((o) => !plano.maxEquipamentosPorOs || o.itens.length < plano.maxEquipamentosPorOs);
      let alvo = modo === 'ambiente'
        ? cabe.find((o) => o.itens.every((i) => i.equipamento.ambienteId === eq.ambienteId))
        : [...cabe].sort((a, b) => a.itens.length - b.itens.length)[0];

      if (alvo) {
        await prisma.ordemServicoItem.create({
          data: { ordemServicoId: alvo.id, equipamentoId, statusItem: 'pendente', checklistSnapshot: snapshot },
        });
        // O.S. que passa a cobrir mais de um ambiente vira "Vários ambientes"
        if (modo === 'cliente' && alvo.itens.some((i) => i.equipamento.ambienteId !== eq.ambienteId)) {
          const varios = await ambienteVarios(prisma, plano.clienteId, plano.empresaId);
          await prisma.ordemServico.update({ where: { id: alvo.id }, data: { ambienteId: varios } });
        }
        await agenda.sincronizarOs(alvo.id);
        r.osAjustadas++;
      } else {
        const modelo = osDoDia[0];
        const nova = await prisma.ordemServico.create({
          data: {
            ambienteId: eq.ambienteId,
            planoId: plano.id,
            tecnicoId: plano.tecnicoId,
            tipoServicoId: plano.tipoServicoId,
            status: 'agendada',
            tipo: 'preventiva',
            origem: 'preventiva_automatica',
            dataAgendamento: modelo.dataAgendamento,
            horaInicio: plano.horaInicio,
            horaFim: plano.horaFim,
            empresaId: plano.empresaId ?? undefined,
          },
          select: { id: true },
        });
        await prisma.ordemServicoItem.create({
          data: { ordemServicoId: nova.id, equipamentoId, statusItem: 'pendente', checklistSnapshot: snapshot },
        });
        await agenda.sincronizarOs(nova.id);
        r.osCriadas++;
      }
      r.itensIncluidos++;
    }
  }
  return r;
}
