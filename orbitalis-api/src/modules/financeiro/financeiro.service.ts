import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo() {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const inicio12Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);

    // ── Orçamentos aprovados ────────────────────────────────────────────────
    const orcamentosAprovados = await this.prisma.orcamento.findMany({
      where: { status: 'aprovado' },
      include: {
        itens: true,
        cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      },
      orderBy: { aprovadoEm: 'desc' },
    });

    const aprovadosComTotal = orcamentosAprovados.map((orc) => ({
      id: orc.id,
      numero: orc.numero,
      titulo: orc.titulo,
      cliente: orc.cliente.nomeFantasia ?? orc.cliente.razaoSocial,
      aprovadoEm: orc.aprovadoEm,
      total: orc.itens.reduce(
        (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      ),
    }));

    const receitaTotal = aprovadosComTotal.reduce((s, o) => s + o.total, 0);

    const receitaMes = aprovadosComTotal
      .filter((o) => o.aprovadoEm && o.aprovadoEm >= inicioMes && o.aprovadoEm <= fimMes)
      .reduce((s, o) => s + o.total, 0);

    const ticketMedio = aprovadosComTotal.length > 0 ? receitaTotal / aprovadosComTotal.length : 0;

    // ── Orçamentos enviados (pendentes) ────────────────────────────────────
    const enviados = await this.prisma.orcamento.findMany({
      where: { status: 'enviado' },
      include: { itens: true },
    });

    const receitaPendente = enviados.reduce((s, orc) => {
      const total = orc.itens.reduce(
        (si, i) => si + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      );
      return s + total;
    }, 0);

    // ── Evolução mensal: últimos 12 meses ──────────────────────────────────
    const porMes: Record<string, number> = {};
    for (const orc of aprovadosComTotal) {
      if (!orc.aprovadoEm || orc.aprovadoEm < inicio12Meses) continue;
      const key = this.mesKey(orc.aprovadoEm);
      porMes[key] = (porMes[key] ?? 0) + orc.total;
    }

    const evolucaoMensal = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      const key = this.mesKey(d);
      return { mes: key, valor: porMes[key] ?? 0 };
    });

    // ── Contratos ──────────────────────────────────────────────────────────
    const contratos = await this.prisma.contrato.findMany({
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
      orderBy: { vigenciaFim: 'asc' },
    });

    const contratosAtivos = contratos.filter(
      (c) => c.ativo && c.vigenciaFim >= hoje,
    );
    const mrrContratos = contratosAtivos.reduce(
      (s, c) => s + (c.valorMensal ? Number(c.valorMensal) : 0),
      0,
    );

    const limite30 = new Date(hoje);
    limite30.setDate(limite30.getDate() + 30);

    const contratosVencendo = contratosAtivos
      .filter((c) => c.vigenciaFim <= limite30)
      .map((c) => ({
        id: c.id,
        descricao: c.descricao,
        cliente: c.cliente.nomeFantasia ?? c.cliente.razaoSocial,
        valorMensal: c.valorMensal ? Number(c.valorMensal) : null,
        vigenciaFim: c.vigenciaFim,
      }));

    // ── Custo operacional do mês ──────────────────────────────────────────
    const osDoMes = await this.prisma.ordemServico.findMany({
      where: {
        status: 'concluida',
        dataConclusao: { gte: inicioMes, lte: fimMes },
      },
      select: { valorMaoObra: true, valorPecas: true },
    });

    const custoMaoObra = osDoMes.reduce(
      (s, os) => s + (os.valorMaoObra ? Number(os.valorMaoObra) : 0),
      0,
    );
    const custoPecas = osDoMes.reduce(
      (s, os) => s + (os.valorPecas ? Number(os.valorPecas) : 0),
      0,
    );
    const custoMes = custoMaoObra + custoPecas;
    const margemMes = receitaMes - custoMes;

    return {
      receitaMes,
      receitaTotal,
      receitaPendente,
      ticketMedio,
      mrrContratos,
      contratosAtivos: contratosAtivos.length,
      contratosVencendo,
      custoMes,
      custoMaoObra,
      custoPecas,
      margemMes,
      evolucaoMensal,
      ultimosAprovados: aprovadosComTotal.slice(0, 8),
    };
  }

  private mesKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
