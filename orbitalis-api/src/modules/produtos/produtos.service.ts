import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularMovimento, MOTIVOS_POR_TIPO, TipoMovimento } from './calculo-estoque';
import { CreateProdutoDto, MovimentarEstoqueDto, UpdateProdutoDto } from './dto/produto.dto';
import { dataHoraBr, formatarNumeroBr, lerNumeroBr, lerPlanilha, lerSimNao, montarPlanilha, ResultadoImportacao, resultadoVazio } from '../../common/planilha';

// Layout idêntico ao do sistema de origem (exportação e modelo de importação)
export const CABECALHO_EXPORTACAO_PRODUTOS = ['Código', 'Nome', 'Código de barra', 'Valor de custo', 'Valor de venda', 'Estoque', 'NCM', 'Cadastrado em'];
export const CABECALHO_MODELO_PRODUTOS = ['Código', 'Nome do produto *', 'Preço de compra', 'Preço de venda', 'Qtd. Estoque', 'Min. Estoque', 'Max. Estoque', 'Unidade', 'Código de barras (GTIN/EAN)', 'NCM', 'CEST', 'Origem', 'Grupo do produto', 'Peso Bruto (quilos)', 'Peso Líquido (quilos)', 'Comissão (%)'];
const MAX_LINHAS_IMPORTACAO = 2000;

const vazioNulo = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());
const num = (d: Prisma.Decimal | number | null | undefined) => Number(d ?? 0);
// "2026-11-27" → início do dia em Brasília
const diaBr = (d: string, fim = false) => new Date(`${d}T${fim ? '23:59:59.999' : '00:00:00.000'}-03:00`);

export type FiltroProdutos = { q?: string; categoria?: string; ativo?: string; situacao?: string };

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltroProdutos) {
    const termo = f.q?.trim();
    const where: Prisma.ProdutoWhereInput = {
      deletedAt: null,
      ...(f.ativo === 'true' ? { ativo: true } : f.ativo === 'false' ? { ativo: false } : {}),
      ...(f.categoria ? { categoria: f.categoria } : {}),
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: 'insensitive' } },
              { codigoInterno: { contains: termo, mode: 'insensitive' } },
              { codigoBarras: { contains: termo, mode: 'insensitive' } },
              { marca: { contains: termo, mode: 'insensitive' } },
              ...(Number.isInteger(Number(termo)) ? [{ numero: Number(termo) }] : []),
            ],
          }
        : {}),
    };
    const lista = await this.prisma.produto.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: 2000,
      include: { fornecedorPadrao: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
    });
    // comparar saldo × mínimo é coluna com coluna: feito aqui
    if (f.situacao === 'abaixo_minimo') return lista.filter((p) => p.controlaEstoque && num(p.estoqueMinimo) > 0 && num(p.saldo) <= num(p.estoqueMinimo));
    if (f.situacao === 'zerado') return lista.filter((p) => p.controlaEstoque && num(p.saldo) <= 0);
    return lista;
  }

  async categorias() {
    const rows = await this.prisma.produto.findMany({
      where: { deletedAt: null, categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });
    return rows.map((r) => r.categoria as string);
  }

  async buscar(id: string) {
    const p = await this.prisma.produto.findFirst({
      where: { id, deletedAt: null },
      include: { fornecedorPadrao: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  private async validarCodigoInterno(codigo: string | null | undefined, ignorarId?: string) {
    if (!codigo) return;
    const outro = await this.prisma.produto.findFirst({
      where: { codigoInterno: codigo, deletedAt: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      select: { nome: true },
    });
    if (outro) throw new ConflictException(`O código "${codigo}" já está no produto "${outro.nome}"`);
  }

  async criar(dto: CreateProdutoDto, usuarioId: string) {
    const codigoInterno = vazioNulo(dto.codigoInterno);
    await this.validarCodigoInterno(codigoInterno);
    const controla = dto.controlaEstoque ?? true;
    const saldoInicial = controla ? (dto.saldoInicial ?? 0) : 0;
    return this.prisma.$transaction(async (tx) => {
      const criado = await tx.produto.create({
        data: {
          nome: dto.nome.trim(),
          descricao: vazioNulo(dto.descricao),
          codigoInterno,
          codigoBarras: vazioNulo(dto.codigoBarras),
          marca: vazioNulo(dto.marca),
          categoria: vazioNulo(dto.categoria),
          unidade: vazioNulo(dto.unidade) ?? 'un',
          ncm: vazioNulo(dto.ncm),
          precoCusto: dto.precoCusto ?? 0,
          precoVenda: dto.precoVenda ?? 0,
          controlaEstoque: controla,
          ativo: dto.ativo ?? true,
          estoqueMinimo: dto.estoqueMinimo ?? 0,
          localizacao: vazioNulo(dto.localizacao),
          estoqueMaximo: dto.estoqueMaximo ?? 0,
          cest: vazioNulo(dto.cest),
          origem: dto.origem ?? null,
          pesoBruto: dto.pesoBruto ?? 0,
          pesoLiquido: dto.pesoLiquido ?? 0,
          comissaoPercentual: dto.comissaoPercentual ?? 0,
          despesasAcessorias: dto.despesasAcessorias ?? 0,
          outrasDespesas: dto.outrasDespesas ?? 0,
          largura: dto.largura ?? 0,
          altura: dto.altura ?? 0,
          comprimento: dto.comprimento ?? 0,
          codBeneficio: vazioNulo(dto.codBeneficio),
          fornecedorPadraoId: dto.fornecedorPadraoId || null,
          saldo: saldoInicial,
        },
      });
      if (saldoInicial > 0) {
        await tx.movimentoEstoque.create({
          data: {
            produtoId: criado.id, tipo: 'entrada', motivo: 'saldo_inicial', delta: saldoInicial, saldoApos: saldoInicial,
            custoUnitario: dto.precoCusto ?? null, usuarioId, observacao: 'Saldo inicial no cadastro',
          },
        });
      }
      return criado;
    });
  }

  async atualizar(id: string, dto: UpdateProdutoDto) {
    await this.buscar(id);
    const codigoInterno = vazioNulo(dto.codigoInterno);
    await this.validarCodigoInterno(codigoInterno, id);
    return this.prisma.produto.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        descricao: vazioNulo(dto.descricao),
        codigoInterno,
        codigoBarras: vazioNulo(dto.codigoBarras),
        marca: vazioNulo(dto.marca),
        categoria: vazioNulo(dto.categoria),
        unidade: dto.unidade === undefined ? undefined : (vazioNulo(dto.unidade) ?? 'un'),
        ncm: vazioNulo(dto.ncm),
        precoCusto: dto.precoCusto,
        precoVenda: dto.precoVenda,
        controlaEstoque: dto.controlaEstoque,
        estoqueMinimo: dto.estoqueMinimo,
        localizacao: vazioNulo(dto.localizacao),
        estoqueMaximo: dto.estoqueMaximo,
        cest: vazioNulo(dto.cest),
        origem: dto.origem,
        pesoBruto: dto.pesoBruto,
        pesoLiquido: dto.pesoLiquido,
        comissaoPercentual: dto.comissaoPercentual,
        despesasAcessorias: dto.despesasAcessorias,
        outrasDespesas: dto.outrasDespesas,
        largura: dto.largura,
        altura: dto.altura,
        comprimento: dto.comprimento,
        codBeneficio: vazioNulo(dto.codBeneficio),
        fornecedorPadraoId: dto.fornecedorPadraoId === undefined ? undefined : dto.fornecedorPadraoId || null,
        ativo: dto.ativo,
      },
    });
  }

  /** Exclusão lógica: o histórico de movimentos é preservado. */
  async excluir(id: string) {
    await this.buscar(id);
    await this.prisma.produto.update({ where: { id }, data: { deletedAt: new Date(), ativo: false, codigoInterno: null } });
    return { ok: true };
  }

  /** Entrada, saída ou ajuste (contagem) — atômico, com histórico. Tenta de novo se outra pessoa mexeu no saldo ao mesmo tempo. */
  async movimentar(id: string, dto: MovimentarEstoqueDto, usuarioId: string) {
    const motivo = dto.motivo ?? MOTIVOS_POR_TIPO[dto.tipo][0];
    if (!MOTIVOS_POR_TIPO[dto.tipo].includes(motivo)) {
      throw new BadRequestException(`Motivo "${motivo}" não vale para ${dto.tipo}`);
    }
    for (let tentativa = 1; ; tentativa++) {
      try {
        return await this.aplicarMovimento(id, dto, motivo, usuarioId);
      } catch (e) {
        if (e instanceof ConflictException && tentativa < 3) continue;
        throw e;
      }
    }
  }

  private aplicarMovimento(id: string, dto: MovimentarEstoqueDto, motivo: string, usuarioId: string) {
    return this.prisma.$transaction((tx) => this.aplicarMovimentoTx(tx, id, dto, motivo, usuarioId));
  }

  /** Mesmo movimento, dentro de uma transação já aberta (usado pelo inventário para ajustar vários produtos de uma vez). */
  async aplicarMovimentoTx(tx: any, id: string, dto: MovimentarEstoqueDto, motivo: string, usuarioId: string) {
    {
      const p = await tx.produto.findFirst({ where: { id, deletedAt: null } });
      if (!p) throw new NotFoundException('Produto não encontrado');
      if (!p.controlaEstoque) throw new BadRequestException('Este produto não controla estoque');
      const { delta, saldoApos } = calcularMovimento(dto.tipo as TipoMovimento, num(p.saldo), dto.quantidade, true);
      if (dto.tipo === 'ajuste' && delta === 0) throw new BadRequestException('O saldo contado é igual ao saldo atual');

      // só grava se o saldo ainda for o que lemos (evita perder a atualização de outra pessoa)
      const upd = await tx.produto.updateMany({
        where: { id, saldo: p.saldo },
        data: {
          saldo: saldoApos,
          ...(dto.tipo === 'entrada' && dto.custoUnitario !== undefined ? { precoCusto: dto.custoUnitario } : {}),
        },
      });
      if (upd.count !== 1) throw new ConflictException('O saldo mudou durante a operação, tente novamente');

      const mov = await tx.movimentoEstoque.create({
        data: {
          produtoId: id,
          tipo: dto.tipo,
          motivo,
          delta,
          saldoApos,
          custoUnitario: dto.tipo === 'entrada' ? (dto.custoUnitario ?? null) : null,
          fornecedorId: dto.tipo === 'entrada' ? (dto.fornecedorId || null) : null,
          documento: vazioNulo(dto.documento) ?? null,
          observacao: vazioNulo(dto.observacao) ?? null,
          usuarioId,
        },
      });
      return { ...mov, delta: num(mov.delta), saldoApos: num(mov.saldoApos) };
    }
  }

  async movimentos(f: { produtoId?: string; tipo?: string; de?: string; ate?: string; take?: number }) {
    const where: Prisma.MovimentoEstoqueWhereInput = {
      ...(f.produtoId ? { produtoId: f.produtoId } : {}),
      ...(f.tipo && ['entrada', 'saida', 'ajuste'].includes(f.tipo) ? { tipo: f.tipo } : {}),
      ...(f.de || f.ate
        ? { criadoEm: { ...(f.de ? { gte: diaBr(f.de) } : {}), ...(f.ate ? { lte: diaBr(f.ate, true) } : {}) } }
        : {}),
    };
    const rows = await this.prisma.movimentoEstoque.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: Math.min(f.take ?? 200, 500),
      include: {
        produto: { select: { id: true, nome: true, unidade: true, numero: true } },
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      },
    });
    return rows.map((m) => ({ ...m, delta: num(m.delta), saldoApos: num(m.saldoApos), custoUnitario: m.custoUnitario == null ? null : num(m.custoUnitario) }));
  }

  /** Números do topo da tela de estoque. */
  async resumo() {
    const produtos = await this.prisma.produto.findMany({
      where: { deletedAt: null, ativo: true, controlaEstoque: true },
      select: { id: true, nome: true, unidade: true, saldo: true, estoqueMinimo: true, precoCusto: true, numero: true },
      take: 5000,
    });
    let valorEmEstoque = 0;
    const abaixoMinimo: typeof produtos = [];
    let zerados = 0;
    for (const p of produtos) {
      const saldo = num(p.saldo);
      if (saldo > 0) valorEmEstoque += saldo * num(p.precoCusto);
      if (saldo <= 0) zerados++;
      if (num(p.estoqueMinimo) > 0 && saldo <= num(p.estoqueMinimo)) abaixoMinimo.push(p);
    }
    return {
      totalProdutos: produtos.length,
      valorEmEstoque: Math.round(valorEmEstoque * 100) / 100,
      zerados,
      abaixoMinimo: abaixoMinimo
        .map((p) => ({ id: p.id, numero: p.numero, nome: p.nome, unidade: p.unidade, saldo: num(p.saldo), estoqueMinimo: num(p.estoqueMinimo) }))
        .sort((a, b) => a.saldo / (a.estoqueMinimo || 1) - b.saldo / (b.estoqueMinimo || 1))
        .slice(0, 50),
    };
  }

  async exportar(): Promise<Buffer> {
    const lista = await this.prisma.produto.findMany({
      where: { deletedAt: null }, orderBy: { nome: 'asc' },
      include: { fornecedorPadrao: { select: { razaoSocial: true, nomeFantasia: true } } },
    });
    const linhas = lista.map((p) => [
      p.codigoInterno ?? String(p.numero),
      p.nome,
      p.codigoBarras ?? '',
      formatarNumeroBr(p.precoCusto as any),
      formatarNumeroBr(p.precoVenda as any),
      formatarNumeroBr(p.controlaEstoque ? (p.saldo as any) : 0),
      p.ncm ?? '',
      dataHoraBr(p.criadoEm),
    ]);
    return montarPlanilha('Worksheet', CABECALHO_EXPORTACAO_PRODUTOS, linhas, [18, 50, 18, 16, 16, 12, 14, 20]);
  }

  modeloImportacao(): Promise<Buffer> {
    return montarPlanilha(
      'Produtos',
      CABECALHO_MODELO_PRODUTOS,
      [
        ['PRD001', 'Gás refrigerante R410A 11,3 kg', '900,00', '1.400,00', '5', '2', '20', 'UN', '', '38247800', '', '0', 'Gases', '13,50', '11,30', '3'],
        ['PRD002', 'Tubo de cobre 1/4" (metro)', '18,00', '32,00', '120', '30', '300', 'M', '', '74111000', '', '0', 'Tubulação', '0,20', '0,18', '2'],
      ],
      [14, 44, 16, 16, 14, 14, 14, 10, 26, 12, 10, 8, 20, 20, 20, 14],
    );
  }

  /**
   * Importa a planilha (simular = só valida). Código já existente → atualiza cadastro, SEM mexer no saldo
   * (saldo só muda por movimento/inventário); produto novo → cria, e a coluna Estoque vira o saldo inicial.
   */
  async importar(arquivoBase64: string, simular: boolean, usuarioId: string): Promise<ResultadoImportacao> {
    let planilha;
    try {
      planilha = await lerPlanilha(arquivoBase64);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const res = resultadoVazio(simular);
    if (!planilha.cabecalho.includes('nome') && !planilha.cabecalho.includes('nome do produto')) {
      throw new BadRequestException('Cabeçalho não reconhecido: a planilha precisa da coluna "Nome" (ou "Nome do produto *"). Use o modelo de importação.');
    }
    if (planilha.linhas.length > MAX_LINHAS_IMPORTACAO) throw new BadRequestException(`Limite de ${MAX_LINHAS_IMPORTACAO} linhas por importação.`);
    res.total = planilha.linhas.length;

    const existentes = await this.prisma.produto.findMany({ where: { deletedAt: null, codigoInterno: { not: null } } });
    const porCodigo = new Map(existentes.map((x) => [x.codigoInterno as string, x]));
    const codigosNoArquivo = new Set<string>();
    const lim = (t: string | undefined, n: number) => (t ? t.trim().slice(0, n) : undefined);

    for (const l of planilha.linhas) {
      const v = l.valores;
      const erro = (mensagem: string) => res.erros.push({ linha: l.linha, mensagem });
      const nome = (v['nome do produto'] || v['nome'] || '').trim();
      const codigo = (v['codigo'] || '').trim();
      if (nome.length < 2) { erro('Nome do produto é obrigatório (mínimo 2 letras).'); continue; }
      if (nome.length > 255) { erro('Nome muito longo (máximo 255 caracteres).'); continue; }
      if (codigo.length > 60) { erro('Código muito longo (máximo 60 caracteres).'); continue; }
      if (codigo) {
        if (codigosNoArquivo.has(codigo)) { erro(`Código "${codigo}" repetido na planilha.`); continue; }
        codigosNoArquivo.add(codigo);
      }
      const col = (...chaves: string[]) => chaves.map((k) => v[k]).find((t) => t !== undefined && t !== '') as string | undefined;
      const custo = lerNumeroBr(col('valor de custo', 'preco de compra', 'preco de custo'));
      const venda = lerNumeroBr(col('valor de venda', 'preco de venda'));
      let estoque = lerNumeroBr(col('estoque', 'qtd. estoque', 'quantidade'));
      // sistemas de origem aceitam saldo negativo; aqui o saldo nunca fica abaixo de zero
      if (estoque !== undefined && estoque < 0) {
        res.avisos.push({ linha: l.linha, mensagem: `Estoque negativo (${estoque}) na planilha; considerado 0.` });
        estoque = 0;
      }
      const minimo = lerNumeroBr(col('estoque minimo', 'min. estoque'));
      const maximo = lerNumeroBr(col('max. estoque', 'estoque maximo'));
      const pesoB = lerNumeroBr(col('peso bruto (quilos)', 'peso bruto'));
      const pesoL = lerNumeroBr(col('peso liquido (quilos)', 'peso liquido'));
      const comissao = lerNumeroBr(col('comissao (%)'));
      const origem = lerNumeroBr(col('origem'));
      const numeros = [custo, venda, estoque, minimo, maximo, pesoB, pesoL, comissao, origem];
      if (numeros.some((n) => n !== undefined && Number.isNaN(n))) { erro('Valor numérico inválido (use o formato 1.234,56).'); continue; }
      if (numeros.some((n) => n !== undefined && n < 0)) { erro('Valores não podem ser negativos.'); continue; }
      if ([custo, venda].some((n) => (n ?? 0) > 9_999_999_999) || [estoque, minimo, maximo].some((n) => (n ?? 0) > 99_999_999) || [pesoB, pesoL].some((n) => (n ?? 0) > 9_999_999)) { erro('Valor acima do limite permitido.'); continue; }
      if (comissao !== undefined && comissao > 100) { erro('Comissão não pode passar de 100%.'); continue; }
      if (origem !== undefined && (!Number.isInteger(origem) || origem > 8)) { erro('Origem deve ser um número de 0 a 8.'); continue; }
      const ativoTxt = v['ativo'];
      const ativo = lerSimNao(ativoTxt);
      if (ativoTxt && ativo === undefined) { erro('Coluna Ativo deve ser "Sim" ou "Não".'); continue; }
      const ncm = v['ncm'] ? v['ncm'].replace(/\D/g, '') : undefined;
      if (ncm !== undefined && ncm.length > 10) { erro('NCM inválido.'); continue; }
      const r2 = (n?: number) => (n === undefined ? undefined : Math.round(n * 100) / 100);
      const r3 = (n?: number) => (n === undefined ? undefined : Math.round(n * 1000) / 1000);
      const dados = {
        nome,
        precoCusto: r2(custo),
        precoVenda: r2(venda),
        estoqueMinimo: r3(minimo),
        estoqueMaximo: r3(maximo),
        pesoBruto: r3(pesoB),
        pesoLiquido: r3(pesoL),
        comissaoPercentual: r2(comissao),
        origem: origem,
        cest: lim(col('cest'), 10),
        unidade: lim(col('unidade'), 20),
        categoria: lim(col('grupo do produto', 'categoria'), 80),
        marca: lim(v['marca'], 100),
        ncm: ncm || undefined,
        codigoBarras: lim(col('codigo de barra', 'codigo de barras (gtin/ean)', 'codigo de barras'), 60),
        localizacao: lim(v['localizacao'], 120),
        descricao: v['descricao'] ? v['descricao'].trim() : undefined,
        ativo,
      };
      const atual = codigo ? porCodigo.get(codigo) : undefined;
      try {
        if (atual) {
          const igual = (Object.keys(dados) as (keyof typeof dados)[]).every((k) => {
            const novo = dados[k];
            if (novo === undefined) return true;
            const velho = (atual as any)[k];
            return typeof novo === 'number' ? Number(velho) === novo : velho === novo;
          });
          if (estoque !== undefined && atual.controlaEstoque && Math.abs(Number(atual.saldo) - estoque) > 0.0005) {
            res.avisos.push({ linha: l.linha, mensagem: `Estoque da planilha (${estoque}) difere do sistema (${Number(atual.saldo)}); o saldo não foi alterado. Use Movimentar ou um Inventário para ajustar.` });
          }
          if (igual) { res.semAlteracao++; continue; }
          if (!simular) await this.prisma.produto.update({ where: { id: atual.id }, data: dados });
          res.atualizados++;
        } else {
          if (!simular) {
            await this.criar({ ...(dados as any), codigoInterno: codigo || undefined, saldoInicial: estoque && estoque > 0 ? estoque : undefined }, usuarioId);
          }
          if (estoque && estoque > 0) res.ajustesEstoque++;
          res.criados++;
        }
      } catch (e) {
        erro((e as any)?.message && (e as any).status ? String((e as any).message) : 'Não foi possível gravar esta linha.');
      }
    }
    return res;
  }
}
