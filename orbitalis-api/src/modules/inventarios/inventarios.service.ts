import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProdutosService } from '../produtos/produtos.service';
import { ConcluirInventarioDto, ContagemDto, CreateInventarioDto } from './dto/inventario.dto';

const num = (d: unknown) => Number(d ?? 0);
const arred = (n: number) => Math.round(n * 1000) / 1000;

@Injectable()
export class InventariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly produtos: ProdutosService,
  ) {}

  async listar() {
    const lista = await this.prisma.inventario.findMany({ orderBy: { criadoEm: 'desc' }, take: 100 });
    if (!lista.length) return [];
    const ids = lista.map((i) => i.id);
    const [totais, contados] = await Promise.all([
      this.prisma.inventarioItem.groupBy({ by: ['inventarioId'], where: { inventarioId: { in: ids } }, _count: { _all: true } }),
      this.prisma.inventarioItem.groupBy({ by: ['inventarioId'], where: { inventarioId: { in: ids }, contado: { not: null } }, _count: { _all: true } }),
    ]);
    const t = new Map(totais.map((x) => [x.inventarioId, x._count._all]));
    const c = new Map(contados.map((x) => [x.inventarioId, x._count._all]));
    return lista.map((i) => ({ ...i, totalItens: t.get(i.id) ?? 0, itensContados: c.get(i.id) ?? 0 }));
  }

  async buscar(id: string) {
    const inv = await this.prisma.inventario.findFirst({
      where: { id },
      include: {
        itens: {
          include: { produto: { select: { id: true, numero: true, nome: true, unidade: true, codigoInterno: true, categoria: true, localizacao: true, marca: true, saldo: true } } },
        },
      },
    });
    if (!inv) throw new NotFoundException('Inventário não encontrado');
    // ordem de percurso: local → categoria → nome (facilita conferir na prateleira)
    const itens = inv.itens
      .map((i) => ({
        id: i.id,
        produto: { ...i.produto, saldo: num(i.produto.saldo) },
        saldoSistema: num(i.saldoSistema),
        contado: i.contado == null ? null : num(i.contado),
        contadoEm: i.contadoEm,
        observacao: i.observacao,
        ajusteAplicado: i.ajusteAplicado == null ? null : num(i.ajusteAplicado),
      }))
      .sort((a, b) =>
        (a.produto.localizacao ?? '￿').localeCompare(b.produto.localizacao ?? '￿', 'pt-BR') ||
        (a.produto.categoria ?? '￿').localeCompare(b.produto.categoria ?? '￿', 'pt-BR') ||
        a.produto.nome.localeCompare(b.produto.nome, 'pt-BR'));
    return { ...inv, itens };
  }

  async criar(dto: CreateInventarioDto, usuarioId: string) {
    const abertos = await this.prisma.inventario.count({ where: { status: 'aberto' } });
    if (abertos >= 5) throw new BadRequestException('Já existem 5 inventários abertos. Conclua ou cancele algum antes de abrir outro.');
    const produtos = await this.prisma.produto.findMany({
      where: {
        deletedAt: null, ativo: true, controlaEstoque: true,
        ...(dto.categoria ? { categoria: dto.categoria } : {}),
        ...(dto.localizacao ? { localizacao: dto.localizacao } : {}),
      },
      select: { id: true, saldo: true },
    });
    const alvo = dto.incluirZerados === false ? produtos.filter((p) => num(p.saldo) > 0) : produtos;
    if (!alvo.length) throw new BadRequestException('Nenhum produto com controle de estoque encontrado para esse recorte.');
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventario.create({
        data: {
          titulo: dto.titulo?.trim() || `Inventário de ${hoje}`,
          contagemCega: dto.contagemCega ?? false,
          filtroCategoria: dto.categoria || null,
          filtroLocalizacao: dto.localizacao || null,
          observacoes: dto.observacoes?.trim() || null,
          criadoPorId: usuarioId,
        },
      });
      await tx.inventarioItem.createMany({
        data: alvo.map((p) => ({ inventarioId: inv.id, produtoId: p.id, saldoSistema: p.saldo })),
      });
      return { ...inv, totalItens: alvo.length };
    });
  }

  private async abertoOuErro(id: string) {
    const inv = await this.prisma.inventario.findFirst({ where: { id } });
    if (!inv) throw new NotFoundException('Inventário não encontrado');
    if (inv.status !== 'aberto') throw new BadRequestException('Este inventário já foi encerrado');
    return inv;
  }

  /** Grava contagens (um ou vários itens). contado = null desfaz. */
  async contar(id: string, dto: ContagemDto, usuarioId: string) {
    await this.abertoOuErro(id);
    const ids = [...new Set(dto.itens.map((i) => i.itemId))];
    const existentes = await this.prisma.inventarioItem.findMany({ where: { inventarioId: id, id: { in: ids } }, select: { id: true } });
    if (existentes.length !== ids.length) throw new BadRequestException('Há itens que não pertencem a este inventário');
    const agora = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const i of dto.itens) {
        await tx.inventarioItem.update({
          where: { id: i.itemId },
          data: {
            contado: i.contado,
            contadoEm: i.contado == null ? null : agora,
            contadoPorId: i.contado == null ? null : usuarioId,
            ...(i.observacao !== undefined ? { observacao: i.observacao.trim() || null } : {}),
          },
        });
      }
    });
    return { ok: true, gravados: dto.itens.length };
  }

  /**
   * Fecha o inventário: cada produto contado vira um ajuste no estoque (saldo = contagem).
   * O saldo é conferido NO MOMENTO de fechar; se houve movimentação durante a contagem, o ajuste leva em conta o saldo atual.
   */
  async concluir(id: string, dto: ConcluirInventarioDto, usuarioId: string) {
    const inv = await this.abertoOuErro(id);
    const naoContados = dto.naoContados ?? 'manter';
    const itens = await this.prisma.inventarioItem.findMany({ where: { inventarioId: id } });
    const alvo = itens.filter((i) => i.contado != null || naoContados === 'zerar');
    if (!itens.some((i) => i.contado != null) && naoContados !== 'zerar') {
      throw new BadRequestException('Nenhum item foi contado ainda.');
    }
    const resultado = { ajustados: 0, semDiferenca: 0, sobras: 0, faltas: 0 };
    await this.prisma.$transaction(async (tx) => {
      for (const item of alvo) {
        const contado = num(item.contado);
        const p = await tx.produto.findFirst({ where: { id: item.produtoId, deletedAt: null } });
        if (!p) continue; // produto excluído durante a contagem
        const atual = num(p.saldo);
        if (arred(atual) === arred(contado)) { resultado.semDiferenca++; continue; }
        const mov = await this.produtos.aplicarMovimentoTx(
          tx, item.produtoId,
          { tipo: 'ajuste', quantidade: contado, documento: `Inventário #${inv.numero}`, observacao: item.observacao ?? undefined },
          'ajuste_inventario', usuarioId,
        );
        await tx.inventarioItem.update({ where: { id: item.id }, data: { ajusteAplicado: mov.delta, ...(item.contado == null ? { contado: 0 } : {}) } });
        resultado.ajustados++;
        if (mov.delta > 0) resultado.sobras++; else resultado.faltas++;
      }
      await tx.inventario.update({ where: { id }, data: { status: 'concluido', concluidoEm: new Date(), concluidoPorId: usuarioId } });
    });
    return { ok: true, ...resultado };
  }

  async cancelar(id: string) {
    await this.abertoOuErro(id);
    await this.prisma.inventario.update({ where: { id }, data: { status: 'cancelado', concluidoEm: new Date() } });
    return { ok: true };
  }
}
