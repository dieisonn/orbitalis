import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoteDto, SalvarMarkupDto, SelecaoDto } from './dto/lote.dto';
import { ajustarPreco, calcularVenda } from './markup';

const num = (d: Prisma.Decimal | number | null | undefined) => Number(d ?? 0);
const MAX = 5000;

export type RegraMarkup = { padrao: number; categorias: { categoria: string; percentual: number }[] };

@Injectable()
export class ProdutosLoteService {
  constructor(private readonly prisma: PrismaService) {}

  async obterMarkup(): Promise<RegraMarkup> {
    const regras = await this.prisma.markupRegra.findMany({ orderBy: { categoria: 'asc' } });
    return {
      padrao: num(regras.find((r) => r.categoria === '')?.percentual),
      categorias: regras.filter((r) => r.categoria !== '').map((r) => ({ categoria: r.categoria, percentual: num(r.percentual) })),
    };
  }

  /** Substitui o conjunto de regras (padrão + por grupo). */
  async salvarMarkup(dto: SalvarMarkupDto): Promise<RegraMarkup> {
    const vistos = new Set<string>();
    const cats = dto.categorias
      .map((c) => ({ categoria: c.categoria.trim(), percentual: c.percentual }))
      .filter((c) => c.categoria !== '');
    for (const c of cats) {
      const k = c.categoria.toLowerCase();
      if (vistos.has(k)) throw new BadRequestException(`Grupo "${c.categoria}" repetido`);
      vistos.add(k);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.markupRegra.deleteMany({});
      await tx.markupRegra.createMany({ data: [{ categoria: '', percentual: dto.padrao }, ...cats] });
    });
    return this.obterMarkup();
  }

  private async resolverIds(sel: SelecaoDto): Promise<string[]> {
    if (sel.ids?.length) {
      const rows = await this.prisma.produto.findMany({ where: { id: { in: sel.ids }, deletedAt: null }, select: { id: true } });
      return rows.map((r) => r.id);
    }
    if (sel.filtro) {
      const f = sel.filtro;
      const termo = f.q?.trim();
      const rows = await this.prisma.produto.findMany({
        where: {
          deletedAt: null,
          ...(f.ativo === 'true' ? { ativo: true } : f.ativo === 'false' ? { ativo: false } : {}),
          ...(f.categoria ? { categoria: f.categoria } : {}),
          ...(termo ? { OR: [
            { nome: { contains: termo, mode: 'insensitive' } }, { codigoInterno: { contains: termo, mode: 'insensitive' } },
            { codigoBarras: { contains: termo, mode: 'insensitive' } }, { marca: { contains: termo, mode: 'insensitive' } },
            ...(Number.isInteger(Number(termo)) ? [{ numero: Number(termo) }] : []),
          ] } : {}),
        },
        select: { id: true, controlaEstoque: true, saldo: true, estoqueMinimo: true },
        take: MAX + 1,
      });
      let r = rows;
      if (f.situacao === 'abaixo_minimo') r = rows.filter((p) => p.controlaEstoque && num(p.estoqueMinimo) > 0 && num(p.saldo) <= num(p.estoqueMinimo));
      if (f.situacao === 'zerado') r = rows.filter((p) => p.controlaEstoque && num(p.saldo) <= 0);
      return r.map((p) => p.id);
    }
    throw new BadRequestException('Selecione ao menos um produto');
  }

  /** Produtos da seleção (para etiquetas). */
  async porSelecao(sel: SelecaoDto) {
    const ids = await this.resolverIds(sel);
    if (ids.length > MAX) throw new BadRequestException(`Seleção acima de ${MAX} produtos.`);
    return this.prisma.produto.findMany({ where: { id: { in: ids } }, orderBy: { nome: 'asc' } });
  }

  async executar(dto: LoteDto): Promise<{ acao: string; afetados: number; ignorados: number; motivoIgnorados?: string }> {
    const ids = await this.resolverIds(dto);
    if (ids.length === 0) throw new BadRequestException('Nenhum produto encontrado na seleção');
    if (ids.length > MAX) throw new BadRequestException(`Seleção acima de ${MAX} produtos. Refine a busca.`);

    switch (dto.acao) {
      case 'ativar':
      case 'inativar': {
        const r = await this.prisma.produto.updateMany({ where: { id: { in: ids } }, data: { ativo: dto.acao === 'ativar' } });
        return { acao: dto.acao, afetados: r.count, ignorados: 0 };
      }
      case 'excluir': {
        const r = await this.prisma.produto.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), ativo: false, codigoInterno: null } });
        return { acao: dto.acao, afetados: r.count, ignorados: 0 };
      }
      case 'categoria': {
        const nova = (dto.categoria_nova ?? '').trim();
        const r = await this.prisma.produto.updateMany({ where: { id: { in: ids } }, data: { categoria: nova || null } });
        return { acao: dto.acao, afetados: r.count, ignorados: 0 };
      }
      case 'ajuste_preco': {
        if (dto.percentual === undefined || dto.percentual === 0) throw new BadRequestException('Informe o percentual de ajuste');
        const prods = await this.prisma.produto.findMany({ where: { id: { in: ids } }, select: { id: true, precoVenda: true } });
        await this.prisma.$transaction(prods.map((p) => this.prisma.produto.update({ where: { id: p.id }, data: { precoVenda: ajustarPreco(num(p.precoVenda), dto.percentual!) } })));
        return { acao: dto.acao, afetados: prods.length, ignorados: 0 };
      }
      case 'markup': {
        const regra = await this.obterMarkup();
        const prods = await this.prisma.produto.findMany({ where: { id: { in: ids } }, select: { id: true, categoria: true, precoCusto: true, despesasAcessorias: true, outrasDespesas: true } });
        const ups: Prisma.PrismaPromise<unknown>[] = [];
        let semCusto = 0, semMarkup = 0;
        for (const p of prods) {
          const custo = num(p.precoCusto) + num(p.despesasAcessorias) + num(p.outrasDespesas);
          const doGrupo = regra.categorias.find((c) => c.categoria.toLowerCase() === (p.categoria ?? '').toLowerCase())?.percentual;
          const pct = dto.percentual ?? doGrupo ?? (regra.padrao > 0 ? regra.padrao : undefined);
          if (custo <= 0) { semCusto++; continue; }
          if (pct === undefined) { semMarkup++; continue; }
          ups.push(this.prisma.produto.update({ where: { id: p.id }, data: { precoVenda: calcularVenda(custo, pct) } }));
        }
        if (ups.length) await this.prisma.$transaction(ups);
        const ign = semCusto + semMarkup;
        return {
          acao: dto.acao, afetados: ups.length, ignorados: ign,
          motivoIgnorados: ign ? [semCusto ? `${semCusto} sem custo informado` : '', semMarkup ? `${semMarkup} sem markup definido` : ''].filter(Boolean).join(' · ') : undefined,
        };
      }
    }
  }
}
