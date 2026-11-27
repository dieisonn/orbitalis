import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { montarOrdem } from '../../common/ordenacao';
import { calcularTotais } from '../orcamentos/orcamento-totais';
import { diaUtc, dividirValor, hojeBR, iso, r2, somarMeses, vencimentos } from './datas';
import {
  BaixaDto, CategoriaDto, ContaDto, CreateLancamentoDto, GerarReceberDto, UpdateLancamentoDto,
} from './dto/financeiro.dto';

const CATEGORIAS_PADRAO: { nome: string; tipo: 'receita' | 'despesa' }[] = [
  { nome: 'Serviços', tipo: 'receita' }, { nome: 'Peças e produtos', tipo: 'receita' },
  { nome: 'Contratos e manutenção preventiva', tipo: 'receita' }, { nome: 'Outras receitas', tipo: 'receita' },
  { nome: 'Compra de materiais', tipo: 'despesa' }, { nome: 'Combustível', tipo: 'despesa' },
  { nome: 'Salários e encargos', tipo: 'despesa' }, { nome: 'Impostos', tipo: 'despesa' },
  { nome: 'Aluguel e contas fixas', tipo: 'despesa' }, { nome: 'Ferramentas e equipamentos', tipo: 'despesa' },
  { nome: 'Terceirizados', tipo: 'despesa' }, { nome: 'Outras despesas', tipo: 'despesa' },
];

const INCLUDE_LANC = {
  conta: { select: { id: true, nome: true } },
  categoria: { select: { id: true, nome: true } },
  cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
  fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
  orcamento: { select: { id: true, numero: true, titulo: true } },
} as const;

type FiltroLancamentos = {
  tipo?: string; status?: string; q?: string; de?: string; ate?: string; contaId?: string; categoriaId?: string
  clienteId?: string; fornecedorId?: string; orcamentoId?: string; pagina?: number; limite?: number; ordem?: string; dir?: string
};

const ORDENS = {
  vencimento: (d: 'asc' | 'desc') => ({ vencimento: d }),
  descricao: (d: 'asc' | 'desc') => ({ descricao: d }),
  valor: (d: 'asc' | 'desc') => ({ valor: d }),
  numero: (d: 'asc' | 'desc') => ({ numero: d }),
  status: (d: 'asc' | 'desc') => ({ status: d }),
  pagoEm: (d: 'asc' | 'desc') => ({ pagoEm: d }),
  pessoa: (d: 'asc' | 'desc') => ({ cliente: { razaoSocial: d } }),
};

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Formatação ───────────────────────────────────────────────────────────
  private fmt<T extends { valor: Prisma.Decimal; valorPago: Prisma.Decimal | null; vencimento: Date; pagoEm: Date | null; status: string }>(l: T) {
    const vencimento = iso(l.vencimento);
    return {
      ...l,
      valor: Number(l.valor),
      valorPago: l.valorPago == null ? null : Number(l.valorPago),
      vencimento,
      pagoEm: l.pagoEm ? iso(l.pagoEm) : null,
      situacao: l.status === 'aberto' && vencimento < hojeBR() ? 'atrasado' : l.status,
    };
  }

  // ─── Contas ───────────────────────────────────────────────────────────────
  /** Conta usada quando a baixa não informa uma: a primeira ativa (cria "Caixa" se a empresa ainda não tem nenhuma). */
  async contaPadrao() {
    const existente = await this.prisma.contaFinanceira.findFirst({ where: { ativa: true }, orderBy: { criadoEm: 'asc' } });
    if (existente) return existente;
    return this.prisma.contaFinanceira.create({ data: { nome: 'Caixa', tipo: 'caixa' } });
  }

  async listarContas() {
    await this.contaPadrao();
    const [contas, pagos] = await Promise.all([
      this.prisma.contaFinanceira.findMany({ orderBy: [{ ativa: 'desc' }, { criadoEm: 'asc' }] }),
      this.prisma.lancamento.groupBy({ by: ['contaId', 'tipo'], where: { status: 'pago' }, _sum: { valorPago: true } }),
    ]);
    return contas.map((c) => {
      const mov = (tipo: string) => Number(pagos.find((p) => p.contaId === c.id && p.tipo === tipo)?._sum.valorPago ?? 0);
      return { ...c, saldoInicial: Number(c.saldoInicial), saldoAtual: r2(Number(c.saldoInicial) + mov('receber') - mov('pagar')) };
    });
  }

  async criarConta(dto: ContaDto) {
    if (!dto.nome?.trim()) throw new BadRequestException('Informe o nome da conta');
    return this.prisma.contaFinanceira.create({ data: { nome: dto.nome.trim(), tipo: dto.tipo ?? 'banco', saldoInicial: dto.saldoInicial ?? 0 } });
  }

  async atualizarConta(id: string, dto: ContaDto) {
    const c = await this.prisma.contaFinanceira.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Conta não encontrada');
    if (dto.ativa === false) {
      const outras = await this.prisma.contaFinanceira.count({ where: { ativa: true, id: { not: id } } });
      if (outras === 0) throw new BadRequestException('A empresa precisa ter ao menos uma conta ativa');
    }
    return this.prisma.contaFinanceira.update({
      where: { id },
      data: { ...(dto.nome ? { nome: dto.nome.trim() } : {}), ...(dto.tipo ? { tipo: dto.tipo } : {}), ...(dto.saldoInicial !== undefined ? { saldoInicial: dto.saldoInicial } : {}), ...(dto.ativa !== undefined ? { ativa: dto.ativa } : {}) },
    });
  }

  // ─── Categorias ───────────────────────────────────────────────────────────
  async listarCategorias(tipo?: string) {
    if ((await this.prisma.categoriaFinanceira.count()) === 0) {
      await this.prisma.categoriaFinanceira.createMany({ data: CATEGORIAS_PADRAO.map((c) => ({ ...c, empresaId: undefined })), skipDuplicates: true }).catch(() => null);
    }
    return this.prisma.categoriaFinanceira.findMany({
      where: tipo === 'receita' || tipo === 'despesa' ? { tipo } : {},
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  async criarCategoria(dto: CategoriaDto) {
    if (!dto.nome?.trim() || !dto.tipo) throw new BadRequestException('Informe nome e tipo (receita ou despesa)');
    const ja = await this.prisma.categoriaFinanceira.findFirst({ where: { tipo: dto.tipo, nome: { equals: dto.nome.trim(), mode: 'insensitive' } } });
    if (ja) throw new BadRequestException('Já existe uma categoria com esse nome');
    return this.prisma.categoriaFinanceira.create({ data: { nome: dto.nome.trim(), tipo: dto.tipo } });
  }

  async atualizarCategoria(id: string, dto: CategoriaDto) {
    const c = await this.prisma.categoriaFinanceira.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.categoriaFinanceira.update({ where: { id }, data: { ...(dto.nome ? { nome: dto.nome.trim() } : {}), ...(dto.ativa !== undefined ? { ativa: dto.ativa } : {}) } });
  }

  // ─── Lançamentos ──────────────────────────────────────────────────────────
  private where(f: FiltroLancamentos): Prisma.LancamentoWhereInput {
    const hoje = diaUtc(hojeBR());
    const and: Prisma.LancamentoWhereInput[] = [];
    if (f.tipo === 'receber' || f.tipo === 'pagar') and.push({ tipo: f.tipo });
    if (f.status === 'atrasado') and.push({ status: 'aberto', vencimento: { lt: hoje } });
    else if (f.status === 'aberto') and.push({ status: 'aberto' });
    else if (f.status === 'pago' || f.status === 'cancelado') and.push({ status: f.status });
    else if (f.status !== 'todos') and.push({ status: { not: 'cancelado' } });
    // período: pelo vencimento (pelo pagamento para lançamentos pagos)
    if (f.de || f.ate) {
      const faixa = { ...(f.de ? { gte: diaUtc(f.de) } : {}), ...(f.ate ? { lte: diaUtc(f.ate) } : {}) };
      and.push(f.status === 'pago' ? { pagoEm: faixa } : { vencimento: faixa });
    }
    if (f.contaId) and.push({ contaId: f.contaId });
    if (f.categoriaId) and.push({ categoriaId: f.categoriaId });
    if (f.clienteId) and.push({ clienteId: f.clienteId });
    if (f.fornecedorId) and.push({ fornecedorId: f.fornecedorId });
    if (f.orcamentoId) and.push({ orcamentoId: f.orcamentoId });
    const q = f.q?.trim();
    if (q) {
      const num = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null;
      and.push({
        OR: [
          { descricao: { contains: q, mode: 'insensitive' } }, { documento: { contains: q, mode: 'insensitive' } },
          { cliente: { razaoSocial: { contains: q, mode: 'insensitive' } } }, { cliente: { nomeFantasia: { contains: q, mode: 'insensitive' } } },
          { fornecedor: { razaoSocial: { contains: q, mode: 'insensitive' } } }, { fornecedor: { nomeFantasia: { contains: q, mode: 'insensitive' } } },
          ...(num != null ? [{ numero: num }] : []),
        ],
      });
    }
    return { AND: and };
  }

  async listar(f: FiltroLancamentos) {
    const limite = Math.min(Math.max(Math.floor(f.limite ?? 50) || 50, 10), 200);
    const pagina = Math.max(Math.floor(f.pagina ?? 1) || 1, 1);
    const where = this.where(f);
    const orderBy = montarOrdem(ORDENS, { ordem: f.status === 'pago' ? 'pagoEm' : 'vencimento', dir: f.status === 'pago' ? 'desc' : 'asc' }, f.ordem, f.dir) as Prisma.LancamentoOrderByWithRelationInput[];
    const [total, soma, itens] = await Promise.all([
      this.prisma.lancamento.count({ where }),
      this.prisma.lancamento.aggregate({ where, _sum: { valor: true } }),
      this.prisma.lancamento.findMany({ where, orderBy, skip: (pagina - 1) * limite, take: limite, include: INCLUDE_LANC }),
    ]);
    return { itens: itens.map((l) => this.fmt(l)), total, somaValor: Number(soma._sum.valor ?? 0), pagina, limite };
  }

  async buscar(id: string) {
    const l = await this.prisma.lancamento.findUnique({ where: { id }, include: INCLUDE_LANC });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    return this.fmt(l);
  }

  async criar(dto: CreateLancamentoDto, usuarioId: string | null) {
    const n = dto.parcelas ?? 1;
    if (dto.baixa && n > 1) throw new BadRequestException('Lançamento já baixado não pode ser parcelado');
    if (dto.tipo === 'receber' && dto.fornecedorId) throw new BadRequestException('Conta a receber não tem fornecedor');
    if (dto.tipo === 'pagar' && dto.clienteId) throw new BadRequestException('Conta a pagar não tem cliente: use fornecedor');
    const valores = dividirValor(dto.valor, n);
    const datas = vencimentos(dto.vencimento.slice(0, 10), n, dto.intervalo);
    const grupoId = n > 1 ? randomUUID() : null;
    const contaBaixa = dto.baixa ? (dto.baixa.contaId ?? dto.contaId ?? (await this.contaPadrao()).id) : null;

    const criados = await this.prisma.$transaction(async (tx) => {
      const out: Prisma.LancamentoGetPayload<{ include: typeof INCLUDE_LANC }>[] = [];
      for (let i = 0; i < n; i++) {
        out.push(await tx.lancamento.create({
          data: {
            tipo: dto.tipo, descricao: n > 1 ? `${dto.descricao.trim()} (${i + 1}/${n})` : dto.descricao.trim(),
            valor: valores[i], vencimento: diaUtc(datas[i]), documento: dto.documento || null, observacoes: dto.observacoes || null,
            categoriaId: dto.categoriaId ?? null, clienteId: dto.clienteId ?? null, fornecedorId: dto.fornecedorId ?? null,
            contaId: dto.contaId ?? null, grupoId, parcela: n > 1 ? i + 1 : null, totalParcelas: n > 1 ? n : null, criadoPorId: usuarioId,
            ...(dto.baixa ? { status: 'pago', pagoEm: diaUtc(dto.baixa.pagoEm ?? hojeBR()), valorPago: dto.baixa.valorPago ?? valores[i], contaId: contaBaixa } : {}),
          },
          include: INCLUDE_LANC,
        }));
      }
      return out;
    });
    return { lancamentos: criados.map((l) => this.fmt(l)) };
  }

  async atualizar(id: string, dto: UpdateLancamentoDto) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    if (l.status === 'cancelado') throw new BadRequestException('Lançamento cancelado não pode ser editado');
    if (l.status === 'pago' && (dto.valor !== undefined || dto.vencimento !== undefined))
      throw new BadRequestException('Lançamento já baixado: estorne a baixa para alterar valor ou vencimento');
    if (l.tipo === 'receber' && dto.fornecedorId) throw new BadRequestException('Conta a receber não tem fornecedor');
    if (l.tipo === 'pagar' && dto.clienteId) throw new BadRequestException('Conta a pagar não tem cliente: use fornecedor');
    const atualizado = await this.prisma.lancamento.update({
      where: { id },
      data: {
        ...(dto.descricao !== undefined ? { descricao: dto.descricao.trim() } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.vencimento !== undefined ? { vencimento: diaUtc(dto.vencimento) } : {}),
        ...(dto.categoriaId !== undefined ? { categoriaId: dto.categoriaId } : {}),
        ...(dto.clienteId !== undefined ? { clienteId: dto.clienteId } : {}),
        ...(dto.fornecedorId !== undefined ? { fornecedorId: dto.fornecedorId } : {}),
        ...(dto.contaId !== undefined ? { contaId: dto.contaId } : {}),
        ...(dto.documento !== undefined ? { documento: dto.documento || null } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes || null } : {}),
      },
      include: INCLUDE_LANC,
    });
    return this.fmt(atualizado);
  }

  async baixar(id: string, dto: BaixaDto) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    if (l.status !== 'aberto') throw new BadRequestException(l.status === 'pago' ? 'Este lançamento já foi baixado' : 'Lançamento cancelado não pode ser baixado');
    const pagoEm = dto.pagoEm?.slice(0, 10) ?? hojeBR();
    if (pagoEm > hojeBR()) throw new BadRequestException('A data da baixa não pode ser no futuro');
    const contaId = dto.contaId ?? l.contaId ?? (await this.contaPadrao()).id;
    const atualizado = await this.prisma.lancamento.update({
      where: { id },
      data: { status: 'pago', pagoEm: diaUtc(pagoEm), valorPago: dto.valorPago ?? l.valor, contaId },
      include: INCLUDE_LANC,
    });
    return this.fmt(atualizado);
  }

  async estornar(id: string) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    if (l.status !== 'pago') throw new BadRequestException('Só é possível estornar lançamento baixado');
    return this.fmt(await this.prisma.lancamento.update({ where: { id }, data: { status: 'aberto', pagoEm: null, valorPago: null }, include: INCLUDE_LANC }));
  }

  async cancelar(id: string) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    if (l.status === 'pago') throw new BadRequestException('Lançamento baixado: estorne a baixa antes de cancelar');
    return this.fmt(await this.prisma.lancamento.update({ where: { id }, data: { status: l.status === 'cancelado' ? 'aberto' : 'cancelado' }, include: INCLUDE_LANC }));
  }

  async excluir(id: string) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    if (l.status === 'pago') throw new BadRequestException('Lançamento baixado: estorne a baixa antes de excluir');
    await this.prisma.lancamento.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Visão geral e fluxo de caixa ─────────────────────────────────────────
  async resumo() {
    const hoje = diaUtc(hojeBR());
    const inicioMes = diaUtc(`${hojeBR().slice(0, 8)}01`);
    const fimMes = diaUtc(somarMeses(`${hojeBR().slice(0, 8)}01`, 1));
    const soma = async (where: Prisma.LancamentoWhereInput, campo: 'valor' | 'valorPago' = 'valor') => {
      const r = await this.prisma.lancamento.aggregate({ where, _sum: { [campo]: true }, _count: true });
      return { total: Number((r._sum as Record<string, Prisma.Decimal | null>)[campo] ?? 0), qtd: r._count };
    };
    const [receberAberto, receberAtrasado, pagarAberto, pagarAtrasado, venceHojeReceber, venceHojePagar, recebidoMes, pagoMes, contas, aFaturar] = await Promise.all([
      soma({ tipo: 'receber', status: 'aberto' }), soma({ tipo: 'receber', status: 'aberto', vencimento: { lt: hoje } }),
      soma({ tipo: 'pagar', status: 'aberto' }), soma({ tipo: 'pagar', status: 'aberto', vencimento: { lt: hoje } }),
      soma({ tipo: 'receber', status: 'aberto', vencimento: hoje }), soma({ tipo: 'pagar', status: 'aberto', vencimento: hoje }),
      soma({ tipo: 'receber', status: 'pago', pagoEm: { gte: inicioMes, lt: fimMes } }, 'valorPago'),
      soma({ tipo: 'pagar', status: 'pago', pagoEm: { gte: inicioMes, lt: fimMes } }, 'valorPago'),
      this.listarContas(), this.aFaturar(),
    ]);
    return {
      receberAberto, receberAtrasado, pagarAberto, pagarAtrasado, venceHojeReceber, venceHojePagar, recebidoMes, pagoMes,
      saldoContas: r2(contas.filter((c) => c.ativa).reduce((s, c) => s + c.saldoAtual, 0)),
      contas, aFaturar,
    };
  }

  /** Fluxo de caixa: realizado (pelo pagamento) e previsto (pelo vencimento dos abertos), com saldo acumulado. */
  async fluxo(de: string, ate: string, agrupar: 'dia' | 'mes' = 'dia') {
    if (!de || !ate || de > ate) throw new BadRequestException('Período inválido');
    if (agrupar === 'dia' && (diaUtc(ate).getTime() - diaUtc(de).getTime()) / 86_400_000 > 92) throw new BadRequestException('Para períodos acima de 3 meses, agrupe por mês');
    const ini = diaUtc(de), fim = diaUtc(ate);
    const [contas, antesPagos, rows] = await Promise.all([
      this.prisma.contaFinanceira.findMany({ select: { saldoInicial: true } }),
      this.prisma.lancamento.groupBy({ by: ['tipo'], where: { status: 'pago', pagoEm: { lt: ini } }, _sum: { valorPago: true } }),
      this.prisma.lancamento.findMany({
        where: { OR: [{ status: 'pago', pagoEm: { gte: ini, lte: fim } }, { status: 'aberto', vencimento: { lte: fim } }] },
        select: { tipo: true, status: true, valor: true, valorPago: true, vencimento: true, pagoEm: true }, take: 50_000,
      }),
    ]);
    const mov = (t: string) => Number(antesPagos.find((p) => p.tipo === t)?._sum.valorPago ?? 0);
    const saldoInicial = r2(contas.reduce((s, c) => s + Number(c.saldoInicial), 0) + mov('receber') - mov('pagar'));

    const chave = (d: string) => (agrupar === 'mes' ? d.slice(0, 7) : d);
    const baldes = new Map<string, { periodo: string; entradasRealizadas: number; saidasRealizadas: number; entradasPrevistas: number; saidasPrevistas: number }>();
    const garantir = (k: string) => {
      if (!baldes.has(k)) baldes.set(k, { periodo: k, entradasRealizadas: 0, saidasRealizadas: 0, entradasPrevistas: 0, saidasPrevistas: 0 });
      return baldes.get(k)!;
    };
    // todos os períodos do intervalo aparecem, mesmo vazios
    for (let d = de; d <= ate; d = iso(new Date(diaUtc(d).getTime() + 86_400_000))) garantir(chave(d));
    let atrasadosEntradas = 0, atrasadosSaidas = 0;
    for (const r of rows) {
      const entrada = r.tipo === 'receber';
      if (r.status === 'pago') {
        const b = garantir(chave(iso(r.pagoEm!)));
        if (entrada) b.entradasRealizadas += Number(r.valorPago); else b.saidasRealizadas += Number(r.valorPago);
      } else {
        const venc = iso(r.vencimento);
        // abertos que venceram antes do período entram no primeiro dia (ainda vão acontecer)
        const dentro = venc < de ? de : venc;
        if (venc < de) { if (entrada) atrasadosEntradas += Number(r.valor); else atrasadosSaidas += Number(r.valor); }
        const b = garantir(chave(dentro));
        if (entrada) b.entradasPrevistas += Number(r.valor); else b.saidasPrevistas += Number(r.valor);
      }
    }
    let saldo = saldoInicial;
    const periodos = [...baldes.values()].sort((a, b) => a.periodo.localeCompare(b.periodo)).map((b) => {
      saldo = r2(saldo + b.entradasRealizadas - b.saidasRealizadas + b.entradasPrevistas - b.saidasPrevistas);
      return { ...b, entradasRealizadas: r2(b.entradasRealizadas), saidasRealizadas: r2(b.saidasRealizadas), entradasPrevistas: r2(b.entradasPrevistas), saidasPrevistas: r2(b.saidasPrevistas), saldoProjetado: saldo };
    });
    const tot = (k: 'entradasRealizadas' | 'saidasRealizadas' | 'entradasPrevistas' | 'saidasPrevistas') => r2(periodos.reduce((s, p) => s + p[k], 0));
    return {
      de, ate, agrupar, saldoInicial, atrasadosEntradas: r2(atrasadosEntradas), atrasadosSaidas: r2(atrasadosSaidas), periodos,
      totais: { entradasRealizadas: tot('entradasRealizadas'), saidasRealizadas: tot('saidasRealizadas'), entradasPrevistas: tot('entradasPrevistas'), saidasPrevistas: tot('saidasPrevistas'), saldoFinal: saldo },
    };
  }

  // ─── Orçamentos aprovados → contas a receber ──────────────────────────────
  /** Orçamentos aprovados que ainda não geraram cobrança. */
  async aFaturar() {
    const orcs = await this.prisma.orcamento.findMany({
      where: { status: 'aprovado', lancamentos: { none: { status: { not: 'cancelado' } } } },
      include: { itens: true, cliente: { select: { razaoSocial: true, nomeFantasia: true } }, parcelas: { select: { id: true } } },
      orderBy: { aprovadoEm: 'desc' }, take: 100,
    });
    return orcs
      .map((o) => ({ id: o.id, numero: o.numero, titulo: o.titulo, cliente: o.cliente.nomeFantasia ?? o.cliente.razaoSocial, aprovadoEm: o.aprovadoEm, parcelas: o.parcelas.length, total: calcularTotais(o.itens, o.descontoTipo, o.desconto, o.frete).total }))
      .filter((o) => o.total > 0);
  }

  async gerarReceberDoOrcamento(orcamentoId: string, dto: GerarReceberDto, usuarioId: string | null) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id: orcamentoId }, include: { itens: true, parcelas: { orderBy: { numero: 'asc' } } } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'aprovado') throw new BadRequestException('Só orçamento aprovado gera contas a receber');
    if ((await this.prisma.lancamento.count({ where: { orcamentoId, status: { not: 'cancelado' } } })) > 0)
      throw new BadRequestException('Este orçamento já tem contas a receber geradas');
    const total = calcularTotais(orc.itens, orc.descontoTipo, orc.desconto, orc.frete).total;
    if (total <= 0) throw new BadRequestException('Orçamento sem valor: não há o que cobrar');

    const base = orc.parcelas.length
      ? orc.parcelas.map((p) => ({ vencimento: iso(p.vencimento), valor: Number(p.valor) }))
      : [{ vencimento: (dto.vencimento ?? hojeBR()).slice(0, 10), valor: total }];
    if (Math.abs(base.reduce((s, p) => s + p.valor, 0) - total) > 0.011) throw new BadRequestException('A soma das parcelas não confere com o total do orçamento: ajuste o orçamento');
    const categoriaId = dto.categoriaId ?? (await this.prisma.categoriaFinanceira.findFirst({ where: { tipo: 'receita', nome: 'Serviços' }, select: { id: true } }))?.id ?? null;
    const grupoId = base.length > 1 ? randomUUID() : null;
    const rotulo = `Orçamento #${String(orc.numero).padStart(4, '0')} — ${orc.titulo}`.slice(0, 240);

    const criados = await this.prisma.$transaction(async (tx) => {
      const out: Prisma.LancamentoGetPayload<{ include: typeof INCLUDE_LANC }>[] = [];
      for (let i = 0; i < base.length; i++) {
        out.push(await tx.lancamento.create({
          data: {
            tipo: 'receber', descricao: base.length > 1 ? `${rotulo} (${i + 1}/${base.length})` : rotulo, valor: base[i].valor, vencimento: diaUtc(base[i].vencimento),
            clienteId: orc.clienteId, orcamentoId, categoriaId, contaId: dto.contaId ?? null, grupoId, parcela: base.length > 1 ? i + 1 : null, totalParcelas: base.length > 1 ? base.length : null, criadoPorId: usuarioId,
          },
          include: INCLUDE_LANC,
        }));
      }
      return out;
    });
    return { lancamentos: criados.map((l) => this.fmt(l)) };
  }
}
