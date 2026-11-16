import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DIA = 86_400_000;
const num = (d: unknown) => (d == null ? 0 : Number(d));
const arred = (n: number, c = 1) => Math.round(n * 10 ** c) / 10 ** c;
const media = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const emAberto = (s: string) => s !== 'concluida' && s !== 'cancelada';
const nomeCliente = (c?: { nomeFantasia?: string | null; razaoSocial?: string } | null) => c?.nomeFantasia || c?.razaoSocial || '—';
const mesDe = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
// "dia" no horário de Brasília para datas com hora (conclusão); datas só-dia (agendamento) já vêm em UTC
const diaBrasilia = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

/** Período do relatório: padrão = últimos 90 dias. `de`/`ate` no formato AAAA-MM-DD. */
export function periodoDe(de?: string, ate?: string) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const fim = ate && /^\d{4}-\d{2}-\d{2}$/.test(ate) ? new Date(`${ate}T23:59:59.999Z`) : new Date(hoje.getTime() + DIA - 1);
  const ini = de && /^\d{4}-\d{2}-\d{2}$/.test(de) ? new Date(`${de}T00:00:00.000Z`) : new Date(fim.getTime() - 90 * DIA + 1);
  return { ini, fim, hoje, de: ini.toISOString().slice(0, 10), ate: fim.toISOString().slice(0, 10) };
}

@Injectable()
export class RelatoriosAnaliticosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Contratos e planos PMOC ───────────────────────────────────────────────
  async contratos(deQ?: string, ateQ?: string, clienteId?: string) {
    const { ini, fim, hoje, de, ate } = periodoDe(deQ, ateQ);
    const contratos = await this.prisma.contrato.findMany({
      where: { vigenciaInicio: { lte: fim }, vigenciaFim: { gte: ini }, ...(clienteId ? { clienteId } : {}) },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        planos: { select: { id: true, ativo: true } },
        renovacoes: { select: { id: true } },
      },
      orderBy: { vigenciaFim: 'asc' },
    });
    const planoIds = contratos.flatMap((c) => c.planos.map((p) => p.id));
    const ordens = planoIds.length
      ? await this.prisma.ordemServico.findMany({
          where: { planoId: { in: planoIds }, status: { not: 'cancelada' } },
          select: { planoId: true, status: true, dataAgendamento: true },
        })
      : [];

    const linhas = contratos.map((c) => {
      const ids = new Set(c.planos.map((p) => p.id));
      const os = ordens.filter((o) => o.planoId && ids.has(o.planoId) && o.dataAgendamento >= c.vigenciaInicio && o.dataAgendamento <= c.vigenciaFim);
      const concluidas = os.filter((o) => o.status === 'concluida').length;
      const atrasadas = os.filter((o) => emAberto(o.status) && o.dataAgendamento < hoje).length;
      const futuras = os.filter((o) => emAberto(o.status) && o.dataAgendamento >= hoje).length;
      const devidas = concluidas + atrasadas;
      const diasParaFim = Math.round((c.vigenciaFim.getTime() - hoje.getTime()) / DIA);
      const situacao = c.renovacoes.length ? 'renovado' : diasParaFim < 0 ? 'vencido' : diasParaFim <= 60 ? 'vence_em_breve' : 'vigente';
      const meses = Math.max(1, Math.round((c.vigenciaFim.getTime() - c.vigenciaInicio.getTime()) / (DIA * 30.4)));
      return {
        id: c.id, clienteId: c.cliente.id, cliente: nomeCliente(c.cliente), descricao: c.descricao,
        vigenciaInicio: c.vigenciaInicio, vigenciaFim: c.vigenciaFim, diasParaFim, situacao,
        planosAtivos: c.planos.filter((p) => p.ativo).length, planos: c.planos.length,
        osIncluidas: c.numOsIncluidas, osTotal: os.length, concluidas, atrasadas, futuras,
        cumprimento: devidas ? arred((concluidas / devidas) * 100, 0) : null, // das visitas já devidas, quantas foram feitas
        progresso: os.length ? arred((concluidas / os.length) * 100, 0) : null,
        valorMensal: c.valorMensal == null ? null : num(c.valorMensal), valorTotal: c.valorMensal == null ? null : arred(num(c.valorMensal) * meses, 2),
      };
    }).sort((a, b) => b.atrasadas - a.atrasadas || a.diasParaFim - b.diasParaFim);

    const vigentes = linhas.filter((l) => l.situacao === 'vigente' || l.situacao === 'vence_em_breve');
    const conc = linhas.reduce((s, l) => s + l.concluidas, 0);
    const atr = linhas.reduce((s, l) => s + l.atrasadas, 0);
    return {
      periodo: { de, ate },
      kpis: {
        vigentes: vigentes.length,
        venceEmBreve: linhas.filter((l) => l.situacao === 'vence_em_breve').length,
        vencidosSemRenovar: linhas.filter((l) => l.situacao === 'vencido').length,
        cumprimentoGeral: conc + atr ? arred((conc / (conc + atr)) * 100, 0) : null,
        osAtrasadas: atr,
        receitaMensalRecorrente: arred(vigentes.reduce((s, l) => s + (l.valorMensal ?? 0), 0), 2),
      },
      linhas,
    };
  }

  // ── Produtividade por técnico ─────────────────────────────────────────────
  async produtividade(deQ?: string, ateQ?: string, tecnicoId?: string) {
    const { ini, fim, hoje, de, ate } = periodoDe(deQ, ateQ);
    const ordens = await this.prisma.ordemServico.findMany({
      where: { dataAgendamento: { gte: ini, lte: fim }, ...(tecnicoId ? { tecnicoId } : {}) },
      select: {
        tecnicoId: true, status: true, tipo: true, dataAgendamento: true, dataInicio: true, dataConclusao: true,
        tecnico: { select: { nome: true, email: true } },
        itens: { select: { statusItem: true } },
      },
    });
    const semTecnico = ordens.filter((o) => !o.tecnicoId && emAberto(o.status)).length;
    const porTec = new Map<string, typeof ordens>();
    for (const o of ordens) if (o.tecnicoId) porTec.set(o.tecnicoId, [...(porTec.get(o.tecnicoId) ?? []), o]);

    const linhas = [...porTec.entries()].map(([id, os]) => {
      const validas = os.filter((o) => o.status !== 'cancelada');
      const concl = validas.filter((o) => o.status === 'concluida');
      const atrasadas = validas.filter((o) => emAberto(o.status) && o.dataAgendamento < hoje).length;
      const dias = new Set(concl.filter((o) => o.dataConclusao).map((o) => diaBrasilia(o.dataConclusao!)));
      const noPrazo = concl.filter((o) => o.dataConclusao && diaBrasilia(o.dataConclusao) <= o.dataAgendamento.toISOString().slice(0, 10)).length;
      return {
        tecnicoId: id, tecnico: os[0].tecnico?.nome || os[0].tecnico?.email || '—',
        total: validas.length, concluidas: concl.length, emAberto: validas.filter((o) => emAberto(o.status)).length,
        atrasadas, canceladas: os.length - validas.length,
        preventivas: concl.filter((o) => o.tipo === 'preventiva').length,
        corretivas: concl.filter((o) => o.tipo === 'corretiva').length,
        taxaConclusao: validas.length ? arred((concl.length / validas.length) * 100, 0) : null,
        noPrazo: concl.length ? arred((noPrazo / concl.length) * 100, 0) : null,
        tempoMedioDias: arred(media(concl.filter((o) => o.dataConclusao).map((o) => Math.max(0, (o.dataConclusao!.getTime() - o.dataAgendamento.getTime()) / DIA))) ?? 0, 1),
        execucaoMediaHoras: (() => { const m = media(concl.filter((o) => o.dataInicio && o.dataConclusao).map((o) => Math.max(0, (o.dataConclusao!.getTime() - o.dataInicio!.getTime()) / 3600_000))); return m == null ? null : arred(m, 1) })(),
        equipamentosAtendidos: concl.reduce((s, o) => s + o.itens.filter((i) => i.statusItem === 'concluido').length, 0),
        diasTrabalhados: dias.size,
        osPorDia: dias.size ? arred(concl.length / dias.size, 1) : null,
      };
    }).sort((a, b) => b.concluidas - a.concluidas);

    const porMes: Record<string, { mes: string; total: number; concluidas: number }> = {};
    for (const o of ordens.filter((x) => x.status !== 'cancelada')) {
      const k = mesDe(o.dataAgendamento);
      porMes[k] ??= { mes: k, total: 0, concluidas: 0 };
      porMes[k].total++;
      if (o.status === 'concluida') porMes[k].concluidas++;
    }
    const concTotal = linhas.reduce((s, l) => s + l.concluidas, 0);
    const totalOs = linhas.reduce((s, l) => s + l.total, 0);
    return {
      periodo: { de, ate },
      kpis: {
        tecnicosAtivos: linhas.length,
        concluidas: concTotal,
        taxaConclusao: totalOs ? arred((concTotal / totalOs) * 100, 0) : null,
        atrasadas: linhas.reduce((s, l) => s + l.atrasadas, 0),
        semTecnico,
      },
      linhas,
      porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
    };
  }

  // ── Equipamentos e confiabilidade ─────────────────────────────────────────
  async equipamentos(deQ?: string, ateQ?: string, clienteId?: string) {
    const { ini, fim, hoje, de, ate } = periodoDe(deQ, ateQ);
    const clienteWhere = clienteId ? { ambiente: { clienteId } } : {};
    const itens = await this.prisma.ordemServicoItem.findMany({
      where: {
        ordemServico: { dataAgendamento: { gte: ini, lte: fim }, status: { not: 'cancelada' } },
        equipamento: { deletedAt: null, ...clienteWhere },
      },
      select: {
        equipamentoId: true,
        equipamento: { select: { nome: true, marca: true, tipoEquipamento: true, ambiente: { select: { nome: true, cliente: { select: { razaoSocial: true, nomeFantasia: true } } } } } },
        ordemServico: { select: { tipo: true, status: true, dataAgendamento: true, dataConclusao: true, valorMaoObra: true, valorPecas: true, _count: { select: { itens: true } } } },
      },
    });
    const porEq = new Map<string, typeof itens>();
    for (const i of itens) porEq.set(i.equipamentoId, [...(porEq.get(i.equipamentoId) ?? []), i]);

    const linhas = [...porEq.entries()].map(([id, its]) => {
      const e = its[0].equipamento;
      const corr = its.filter((i) => i.ordemServico.tipo === 'corretiva').sort((a, b) => a.ordemServico.dataAgendamento.getTime() - b.ordemServico.dataAgendamento.getTime());
      const prev = its.filter((i) => i.ordemServico.tipo === 'preventiva' && i.ordemServico.status === 'concluida');
      const corrConcl = corr.filter((i) => i.ordemServico.status === 'concluida' && i.ordemServico.dataConclusao);
      const intervalos = corr.slice(1).map((i, k) => (i.ordemServico.dataAgendamento.getTime() - corr[k].ordemServico.dataAgendamento.getTime()) / DIA);
      const custo = its.reduce((s, i) => s + (num(i.ordemServico.valorMaoObra) + num(i.ordemServico.valorPecas)) / Math.max(1, i.ordemServico._count.itens), 0);
      const mttr = media(corrConcl.map((i) => Math.max(0, (i.ordemServico.dataConclusao!.getTime() - i.ordemServico.dataAgendamento.getTime()) / 3600_000)));
      const mtbf = media(intervalos);
      return {
        equipamentoId: id, equipamento: e.nome, marca: e.marca, tipo: e.tipoEquipamento,
        cliente: nomeCliente(e.ambiente.cliente), ambiente: e.ambiente.nome,
        corretivas: corr.length, preventivas: prev.length, reincidente: corr.length >= 3,
        mttrHoras: mttr == null ? null : arred(mttr, 1), mtbfDias: mtbf == null ? null : arred(mtbf, 0),
        custo: arred(custo, 2),
      };
    }).sort((a, b) => b.corretivas - a.corretivas || b.custo - a.custo);

    // Equipamentos ativos sem nenhuma manutenção concluída nos últimos 180 dias
    const corte = new Date(hoje.getTime() - 180 * DIA);
    const [ativos, recentes] = await Promise.all([
      this.prisma.equipamento.findMany({
        where: { deletedAt: null, ambiente: { deletedAt: null, ...(clienteId ? { clienteId } : {}) } },
        select: { id: true, nome: true, ambiente: { select: { nome: true, cliente: { select: { razaoSocial: true, nomeFantasia: true } } } } },
        take: 2000,
      }),
      this.prisma.ordemServicoItem.findMany({
        where: { ordemServico: { status: 'concluida', dataConclusao: { gte: corte } } },
        select: { equipamentoId: true },
        distinct: ['equipamentoId'],
      }),
    ]);
    const comManut = new Set(recentes.map((r) => r.equipamentoId));
    const semManutencao = ativos.filter((a) => !comManut.has(a.id));

    const porTipo: Record<string, { tipo: string; equipamentos: number; corretivas: number; preventivas: number }> = {};
    for (const l of linhas) {
      porTipo[l.tipo] ??= { tipo: l.tipo, equipamentos: 0, corretivas: 0, preventivas: 0 };
      porTipo[l.tipo].equipamentos++; porTipo[l.tipo].corretivas += l.corretivas; porTipo[l.tipo].preventivas += l.preventivas;
    }
    const corrTotal = linhas.reduce((s, l) => s + l.corretivas, 0);
    const prevTotal = linhas.reduce((s, l) => s + l.preventivas, 0);
    return {
      periodo: { de, ate },
      kpis: {
        equipamentosAtendidos: linhas.length,
        corretivas: corrTotal, preventivas: prevTotal,
        proporcaoPreventiva: corrTotal + prevTotal ? arred((prevTotal / (corrTotal + prevTotal)) * 100, 0) : null,
        reincidentes: linhas.filter((l) => l.reincidente).length,
        semManutencao180d: semManutencao.length,
        custoCorretivas: arred(linhas.reduce((s, l) => s + l.custo, 0), 2),
      },
      linhas: linhas.slice(0, 300),
      porTipo: Object.values(porTipo).sort((a, b) => b.corretivas - a.corretivas),
      semManutencao: semManutencao.slice(0, 100).map((a) => ({ equipamentoId: a.id, equipamento: a.nome, cliente: nomeCliente(a.ambiente.cliente), ambiente: a.ambiente.nome })),
    };
  }

  // ── Financeiro ────────────────────────────────────────────────────────────
  async financeiro(deQ?: string, ateQ?: string, clienteId?: string) {
    const { ini, fim, hoje, de, ate } = periodoDe(deQ, ateQ);
    const [concluidas, orcamentos, contratos] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where: { status: 'concluida', dataConclusao: { gte: ini, lte: fim }, ...(clienteId ? { ambiente: { clienteId } } : {}) },
        select: {
          numero: true, tipo: true, dataConclusao: true, valorMaoObra: true, valorPecas: true,
          ambiente: { select: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } } } },
        },
      }),
      this.prisma.orcamento.findMany({
        where: { status: 'aprovado', aprovadoEm: { gte: ini, lte: fim }, ...(clienteId ? { clienteId } : {}) },
        include: { itens: true },
      }),
      this.prisma.contrato.findMany({
        where: { vigenciaInicio: { lte: fim }, vigenciaFim: { gte: hoje }, ...(clienteId ? { clienteId } : {}) },
        select: { valorMensal: true, renovacoes: { select: { id: true } } },
      }),
    ]);
    const total = (o: { valorMaoObra: unknown; valorPecas: unknown }) => num(o.valorMaoObra) + num(o.valorPecas);
    const maoObra = concluidas.reduce((s, o) => s + num(o.valorMaoObra), 0);
    const pecas = concluidas.reduce((s, o) => s + num(o.valorPecas), 0);
    const comValor = concluidas.filter((o) => total(o) > 0);

    const porMes: Record<string, { mes: string; maoObra: number; pecas: number; os: number }> = {};
    const porCliente = new Map<string, { clienteId: string; cliente: string; os: number; maoObra: number; pecas: number; total: number }>();
    const porTipo: Record<string, { tipo: string; os: number; total: number }> = {};
    for (const o of concluidas) {
      const k = mesDe(o.dataConclusao!);
      porMes[k] ??= { mes: k, maoObra: 0, pecas: 0, os: 0 };
      porMes[k].maoObra += num(o.valorMaoObra); porMes[k].pecas += num(o.valorPecas); porMes[k].os++;
      const c = o.ambiente.cliente;
      const l = porCliente.get(c.id) ?? { clienteId: c.id, cliente: nomeCliente(c), os: 0, maoObra: 0, pecas: 0, total: 0 };
      l.os++; l.maoObra += num(o.valorMaoObra); l.pecas += num(o.valorPecas); l.total += total(o);
      porCliente.set(c.id, l);
      porTipo[o.tipo] ??= { tipo: o.tipo, os: 0, total: 0 };
      porTipo[o.tipo].os++; porTipo[o.tipo].total += total(o);
    }
    const orcTotal = orcamentos.reduce((s, orc) => s + orc.itens.reduce((x, i) => x + Number(i.quantidade) * Number(i.precoUnitario), 0), 0);
    const mrr = contratos.filter((c) => !c.renovacoes.length).reduce((s, c) => s + num(c.valorMensal), 0);
    return {
      periodo: { de, ate },
      kpis: {
        receitaOs: arred(maoObra + pecas, 2), maoObra: arred(maoObra, 2), pecas: arred(pecas, 2),
        ticketMedio: comValor.length ? arred((maoObra + pecas) / comValor.length, 2) : null,
        orcamentosAprovados: arred(orcTotal, 2), orcamentosQtd: orcamentos.length,
        receitaMensalContratos: arred(mrr, 2),
        osConcluidasSemValor: concluidas.length - comValor.length,
        osConcluidas: concluidas.length,
      },
      porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)).map((m) => ({ ...m, maoObra: arred(m.maoObra, 2), pecas: arred(m.pecas, 2) })),
      porCliente: [...porCliente.values()].sort((a, b) => b.total - a.total).slice(0, 30).map((l) => ({ ...l, maoObra: arred(l.maoObra, 2), pecas: arred(l.pecas, 2), total: arred(l.total, 2) })),
      porTipo: Object.values(porTipo).map((t) => ({ ...t, total: arred(t.total, 2) })),
    };
  }
}
