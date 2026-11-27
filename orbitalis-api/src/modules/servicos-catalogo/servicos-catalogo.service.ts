import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServicoDto, LoteServicoDto, UpdateServicoDto } from './dto/servico.dto';
import { ajustarPreco, calcularVenda } from '../produtos/markup';
import { dataHoraBr, formatarNumeroBr, lerNumeroBr, lerPlanilha, lerSimNao, montarPlanilha, ResultadoImportacao, resultadoVazio } from '../../common/planilha';

// Layout idêntico ao do sistema de origem (exportação) e à planilha modelo de importação
export const CABECALHO_EXPORTACAO_SERVICOS = ['Código', 'Nome', 'Valor de custo', 'Valor de venda', 'Comissão (%)', 'Descrição', 'Ativo', 'Atividade de serviço', 'NBS', 'Cadastrado em'];
export const CABECALHO_MODELO_SERVICOS = ['Código', 'Nome do serviço *', 'Valor de custo', 'Valor de venda', 'Atividade de serviço', 'Descrição', 'Comissão (%)'];
const MAX_LINHAS_IMPORTACAO = 2000;

const vazioNulo = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());

@Injectable()
export class ServicosCatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  private filtro(q?: string, ativo?: string): Prisma.ServicoWhereInput {
    const termo = q?.trim();
    return {
      deletedAt: null,
      ...(ativo === 'true' ? { ativo: true } : ativo === 'false' ? { ativo: false } : {}),
      ...(termo
        ? { OR: [{ nome: { contains: termo, mode: 'insensitive' } }, { codigo: { contains: termo, mode: 'insensitive' } }, { descricao: { contains: termo, mode: 'insensitive' } }, ...(Number.isInteger(Number(termo)) ? [{ numero: Number(termo) }] : [])] }
        : {}),
    };
  }

  listar(q?: string, ativo?: string) {
    return this.prisma.servico.findMany({ where: this.filtro(q, ativo), orderBy: { nome: 'asc' }, take: 5000 });
  }

  /** Página de resultados (limite 10–200). */
  async listarPaginado(q: string | undefined, ativo: string | undefined, pagina: number, limite: number) {
    const lim = Math.min(Math.max(Math.floor(limite) || 50, 10), 200);
    const pag = Math.max(Math.floor(pagina) || 1, 1);
    const where = this.filtro(q, ativo);
    const [total, itens] = await Promise.all([
      this.prisma.servico.count({ where }),
      this.prisma.servico.findMany({ where, orderBy: [{ nome: 'asc' }, { id: 'asc' }], skip: (pag - 1) * lim, take: lim }),
    ]);
    return { itens, total, pagina: pag, limite: lim };
  }

  async buscar(id: string) {
    const s = await this.prisma.servico.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Serviço não encontrado');
    return s;
  }

  private async validarCodigo(codigo: string | null | undefined, ignorarId?: string) {
    if (!codigo) return;
    const outro = await this.prisma.servico.findFirst({
      where: { codigo, deletedAt: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      select: { nome: true },
    });
    if (outro) throw new ConflictException(`O código "${codigo}" já está no serviço "${outro.nome}"`);
  }

  async criar(dto: CreateServicoDto) {
    const codigo = vazioNulo(dto.codigo);
    await this.validarCodigo(codigo);
    return this.prisma.servico.create({
      data: {
        codigo,
        valorCusto: dto.valorCusto ?? 0,
        comissaoPercentual: dto.comissaoPercentual ?? 0,
        atividadeServico: vazioNulo(dto.atividadeServico),
        nbs: vazioNulo(dto.nbs),
        nome: dto.nome.trim(),
        descricao: vazioNulo(dto.descricao),
        unidade: vazioNulo(dto.unidade) ?? 'un',
        valor: dto.valor ?? 0,
        tipoServicoId: dto.tipoServicoId || null,
      },
    });
  }

  async atualizar(id: string, dto: UpdateServicoDto) {
    await this.buscar(id);
    const codigo = vazioNulo(dto.codigo);
    await this.validarCodigo(codigo, id);
    return this.prisma.servico.update({
      where: { id },
      data: {
        codigo,
        valorCusto: dto.valorCusto,
        comissaoPercentual: dto.comissaoPercentual,
        atividadeServico: vazioNulo(dto.atividadeServico),
        nbs: vazioNulo(dto.nbs),
        nome: dto.nome?.trim(),
        descricao: vazioNulo(dto.descricao),
        unidade: dto.unidade === undefined ? undefined : (vazioNulo(dto.unidade) ?? 'un'),
        valor: dto.valor,
        tipoServicoId: dto.tipoServicoId === undefined ? undefined : dto.tipoServicoId || null,
        ativo: dto.ativo,
      },
    });
  }

  async excluir(id: string) {
    await this.buscar(id);
    await this.prisma.servico.update({ where: { id }, data: { deletedAt: new Date(), ativo: false, codigo: null } });
    return { ok: true };
  }

  async exportar(): Promise<Buffer> {
    const lista = await this.prisma.servico.findMany({ where: { deletedAt: null }, orderBy: { nome: 'asc' } });
    const linhas = lista.map((x) => [
      x.codigo ?? String(x.numero),
      x.nome,
      formatarNumeroBr(x.valorCusto as any),
      formatarNumeroBr(x.valor as any),
      Number(x.comissaoPercentual) ? formatarNumeroBr(x.comissaoPercentual as any) : '',
      x.descricao ?? '',
      x.ativo ? 'Sim' : 'Não',
      x.atividadeServico ?? '',
      x.nbs ?? '',
      dataHoraBr(x.criadoEm),
    ]);
    return montarPlanilha('Worksheet', CABECALHO_EXPORTACAO_SERVICOS, linhas, [18, 40, 16, 16, 14, 40, 8, 24, 14, 20]);
  }

  modeloImportacao(): Promise<Buffer> {
    return montarPlanilha(
      'Servicos',
      CABECALHO_MODELO_SERVICOS,
      [
        ['SRV001', 'Limpeza de ar-condicionado split 9.000 a 12.000 BTUs', '120,00', '350,00', 'Manutenção', 'Higienização completa', '10'],
        ['SRV002', 'Instalação de split até 12.000 BTUs', '180,00', '650,00', 'Instalação', 'Instalação padrão com até 3 m de tubulação', '10'],
        ['SRV003', 'Visita técnica', '0,00', '150,00', 'Diagnóstico', 'Diagnóstico de falhas', '5'],
      ],
      [14, 44, 16, 16, 24, 44, 14],
    );
  }

  /**
   * Importa a planilha. Com `simular`, só valida e conta (nada é gravado).
   * Regra: código preenchido que já existe → atualiza o serviço; senão, cria. Colunas vazias não apagam dados existentes.
   */
  async importar(arquivoBase64: string, simular: boolean): Promise<ResultadoImportacao> {
    let planilha;
    try {
      planilha = await lerPlanilha(arquivoBase64);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const res = resultadoVazio(simular);
    if (!planilha.cabecalho.includes('nome') && !planilha.cabecalho.includes('nome do servico')) {
      throw new BadRequestException('Cabeçalho não reconhecido: a planilha precisa da coluna "Nome" (ou "Nome do serviço *"). Use o modelo de importação.');
    }
    if (planilha.linhas.length > MAX_LINHAS_IMPORTACAO) {
      throw new BadRequestException(`Limite de ${MAX_LINHAS_IMPORTACAO} linhas por importação.`);
    }
    res.total = planilha.linhas.length;

    const existentes = await this.prisma.servico.findMany({ where: { deletedAt: null, codigo: { not: null } } });
    const porCodigo = new Map(existentes.map((x) => [x.codigo as string, x]));
    const codigosNoArquivo = new Set<string>();

    for (const l of planilha.linhas) {
      const v = l.valores;
      const nome = (v['nome do servico'] || v['nome'] || '').trim();
      const codigo = (v['codigo'] || '').trim();
      const erro = (mensagem: string) => res.erros.push({ linha: l.linha, mensagem });

      if (nome.length < 2) { erro('Nome do serviço é obrigatório (mínimo 2 letras).'); continue; }
      if (nome.length > 255) { erro('Nome muito longo (máximo 255 caracteres).'); continue; }
      if (codigo.length > 60) { erro('Código muito longo (máximo 60 caracteres).'); continue; }
      if (codigo) {
        if (codigosNoArquivo.has(codigo)) { erro(`Código "${codigo}" repetido na planilha.`); continue; }
        codigosNoArquivo.add(codigo);
      }
      const custo = lerNumeroBr(v['valor de custo']);
      const venda = lerNumeroBr(v['valor de venda']);
      const comissao = lerNumeroBr(v['comissao (%)']);
      if ([custo, venda, comissao].some((n) => n !== undefined && Number.isNaN(n))) { erro('Valor numérico inválido (use o formato 1.234,56).'); continue; }
      if ([custo, venda, comissao].some((n) => n !== undefined && n < 0)) { erro('Valores não podem ser negativos.'); continue; }
      if ((custo ?? 0) > 9_999_999_999 || (venda ?? 0) > 9_999_999_999) { erro('Valor acima do limite permitido.'); continue; }
      if (comissao !== undefined && comissao > 100) { erro('Comissão não pode passar de 100%.'); continue; }
      const ativoTxt = v['ativo'];
      const ativo = lerSimNao(ativoTxt);
      if (ativoTxt && ativo === undefined) { erro('Coluna Ativo deve ser "Sim" ou "Não".'); continue; }

      const dados = {
        nome,
        valorCusto: custo === undefined ? undefined : Math.round(custo * 100) / 100,
        valor: venda === undefined ? undefined : Math.round(venda * 100) / 100,
        comissaoPercentual: comissao === undefined ? undefined : Math.round(comissao * 100) / 100,
        descricao: v['descricao'] ? v['descricao'].trim() : undefined,
        atividadeServico: v['atividade de servico'] ? v['atividade de servico'].trim().slice(0, 120) : undefined,
        nbs: v['nbs'] ? v['nbs'].trim().slice(0, 20) : undefined,
        ativo,
      };
      const atual = codigo ? porCodigo.get(codigo) : undefined;
      try {
        if (atual) {
          const igual =
            atual.nome === dados.nome &&
            (dados.valorCusto === undefined || Number(atual.valorCusto) === dados.valorCusto) &&
            (dados.valor === undefined || Number(atual.valor) === dados.valor) &&
            (dados.comissaoPercentual === undefined || Number(atual.comissaoPercentual) === dados.comissaoPercentual) &&
            (dados.descricao === undefined || atual.descricao === dados.descricao) &&
            (dados.atividadeServico === undefined || atual.atividadeServico === dados.atividadeServico) &&
            (dados.nbs === undefined || atual.nbs === dados.nbs) &&
            (dados.ativo === undefined || atual.ativo === dados.ativo);
          if (igual) { res.semAlteracao++; continue; }
          if (!simular) await this.prisma.servico.update({ where: { id: atual.id }, data: dados });
          res.atualizados++;
        } else {
          if (!simular) await this.prisma.servico.create({ data: { ...dados, codigo: codigo || null } });
          res.criados++;
        }
      } catch (e) {
        erro('Não foi possível gravar esta linha.');
      }
    }
    return res;
  }

  // ---------- ações em lote
  async executarLote(dto: LoteServicoDto) {
    let ids: string[];
    if (dto.ids?.length) {
      ids = (await this.prisma.servico.findMany({ where: { id: { in: dto.ids }, deletedAt: null }, select: { id: true } })).map((r) => r.id);
    } else if (dto.filtro) {
      ids = (await this.prisma.servico.findMany({ where: this.filtro(dto.filtro.q, dto.filtro.ativo), select: { id: true }, take: 5001 })).map((r) => r.id);
    } else throw new BadRequestException('Selecione ao menos um serviço');
    if (ids.length === 0) throw new BadRequestException('Nenhum serviço encontrado na seleção');
    if (ids.length > 5000) throw new BadRequestException('Seleção acima de 5000 serviços. Refine a busca.');
    const feito = (afetados: number, ignorados = 0, motivoIgnorados?: string) => ({ acao: dto.acao, afetados, ignorados, motivoIgnorados });

    switch (dto.acao) {
      case 'ativar':
      case 'inativar':
        return feito((await this.prisma.servico.updateMany({ where: { id: { in: ids } }, data: { ativo: dto.acao === 'ativar' } })).count);
      case 'excluir':
        return feito((await this.prisma.servico.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), ativo: false, codigo: null } })).count);
      case 'atividade':
        return feito((await this.prisma.servico.updateMany({ where: { id: { in: ids } }, data: { atividadeServico: (dto.atividade_nova ?? '').trim() || null } })).count);
      case 'ajuste_preco': {
        if (dto.percentual === undefined || dto.percentual === 0) throw new BadRequestException('Informe o percentual de ajuste');
        const lista = await this.prisma.servico.findMany({ where: { id: { in: ids } }, select: { id: true, valor: true } });
        await this.prisma.$transaction(lista.map((x) => this.prisma.servico.update({ where: { id: x.id }, data: { valor: ajustarPreco(Number(x.valor), dto.percentual!) } })));
        return feito(lista.length);
      }
      case 'markup': {
        const geral = Number((await this.prisma.markupRegra.findFirst({ where: { categoria: '' } }))?.percentual ?? 0);
        const pct = dto.percentual ?? (geral > 0 ? geral : undefined);
        if (pct === undefined) throw new BadRequestException('Nenhum markup definido. Informe um percentual ou configure o markup padrão em Produtos.');
        const lista = await this.prisma.servico.findMany({ where: { id: { in: ids } }, select: { id: true, valorCusto: true } });
        const comCusto = lista.filter((x) => Number(x.valorCusto) > 0);
        await this.prisma.$transaction(comCusto.map((x) => this.prisma.servico.update({ where: { id: x.id }, data: { valor: calcularVenda(Number(x.valorCusto), pct) } })));
        const sem = lista.length - comCusto.length;
        return feito(comCusto.length, sem, sem ? `${sem} sem custo informado` : undefined);
      }
    }
  }
}
