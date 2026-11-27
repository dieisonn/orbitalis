import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrcamentoStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnexoOrcamentoDto, CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { ProdutosService } from '../produtos/produtos.service';
import { runWithTenant } from '../../common/tenant.context';
import { calcularTotais } from './orcamento-totais';
import { AgendaService } from '../agenda/agenda.service';
import { resolverChecklistItens } from '../../common/checklist-resolver';

const TIPOS_ANEXO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const ORDEM_ITENS: Prisma.OrcamentoItemOrderByWithRelationInput[] = [{ ordem: 'asc' }, { descricao: 'asc' }];
// 3 MB: o site (Vercel) só repassa requisições de até 4,5 MB e o arquivo viaja em base64 (+33%)
const MAX_ANEXO_BYTES = 3 * 1024 * 1024;
const MAX_ANEXOS = 20;

// Dados que o cliente pode ver pelo link público (sem informações internas da operação)
const INCLUDE_PUBLICO = {
  cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true, endereco: true, telefone: true } },
  criadoPor: { select: { id: true, nome: true, email: true } },
  itens: {
    orderBy: ORDEM_ITENS,
    select: { id: true, descricao: true, quantidade: true, unidade: true, precoUnitario: true, categoria: true },
  },
  parcelas: { orderBy: { numero: 'asc' as const }, select: { id: true, numero: true, vencimento: true, valor: true } },
} as const;

// Visão do admin: inclui como a O.S. será/foi gerada, itens completos e anexos (sem o conteúdo do arquivo)
const INCLUDE_FULL = {
  ...INCLUDE_PUBLICO,
  itens: { orderBy: ORDEM_ITENS },
  ambiente: { select: { id: true, nome: true } },
  tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true } },
  modeloChecklist: { select: { id: true, nome: true } },
  ordemServico: { select: { id: true, numero: true, status: true } },
  anexos: { orderBy: { criadoEm: 'asc' as const }, select: { id: true, nome: true, tipo: true, tamanho: true, criadoEm: true } },
} as const;

// O link público mostra a proposta; ids, vínculos e anotações internas ficam de fora
function paraPublico<T extends Record<string, any>>(orc: T) {
  const {
    empresaId, criadoPorId, clienteId, ambienteId, tipoServicoId, modeloChecklistId, ordemServicoId, visitaOrigemId, observacoesInternas, ...visivel
  } = orc;
  void empresaId; void criadoPorId; void clienteId; void ambienteId;
  void tipoServicoId; void modeloChecklistId; void ordemServicoId; void visitaOrigemId; void observacoesInternas;
  return comTotais(visivel);
}

/** Acrescenta `totais` (subtotal, desconto, frete, total) calculados dos itens. */
function comTotais<T extends { itens?: { quantidade: any; precoUnitario: any }[]; descontoTipo?: string; desconto?: any; frete?: any }>(orc: T) {
  return { ...orc, totais: calcularTotais(orc.itens ?? [], orc.descontoTipo, orc.desconto, orc.frete) };
}

@Injectable()
export class OrcamentosService {
  private readonly logger = new Logger(OrcamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: AgendaService,
    private readonly produtos: ProdutosService,
  ) {}

  async listar(clienteId?: string, status?: OrcamentoStatus) {
    const lista = await this.prisma.orcamento.findMany({
      where: {
        ...(clienteId ? { clienteId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        ordemServico: { select: { id: true, numero: true } },
        itens: { select: { quantidade: true, precoUnitario: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
    // a lista traz só o total (não os itens)
    return lista.map(({ itens, ...o }) => ({
      ...o,
      _count: { itens: itens.length },
      total: calcularTotais(itens, o.descontoTipo, Number(o.desconto), Number(o.frete)).total,
    }));
  }

  async buscarPorId(id: string) {
    const orc = await this.prisma.orcamento.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    const visitaOrigem = orc.visitaOrigemId
      ? await this.prisma.ordemServico.findUnique({
          where: { id: orc.visitaOrigemId },
          select: { id: true, numero: true, dataConclusao: true, tipoServico: { select: { sigla: true } } },
        })
      : null;
    return { ...comTotais(orc), visitaOrigem };
  }

  async buscarPorToken(token: string) {
    const orc = await this.prisma.orcamento.findUnique({
      where: { tokenPublico: token },
      include: INCLUDE_PUBLICO,
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    return paraPublico(orc);
  }

  /** Produtos e serviços do orçamento precisam existir na empresa (a consulta já é filtrada por tenant). */
  private async validarItensDoCadastro(itens: { produtoId?: string | null; servicoId?: string | null }[]) {
    const prod = [...new Set(itens.map((i) => i.produtoId).filter((x): x is string => !!x))];
    const serv = [...new Set(itens.map((i) => i.servicoId).filter((x): x is string => !!x))];
    if (prod.length && (await this.prisma.produto.count({ where: { id: { in: prod }, deletedAt: null } })) !== prod.length)
      throw new BadRequestException('Um dos produtos do orçamento não foi encontrado');
    if (serv.length && (await this.prisma.servico.count({ where: { id: { in: serv }, deletedAt: null } })) !== serv.length)
      throw new BadRequestException('Um dos serviços do orçamento não foi encontrado');
  }

  private itensData(itens: CreateOrcamentoDto['itens']) {
    return itens.map((item, i) => ({
      descricao: item.descricao,
      unidade: item.unidade ?? 'un',
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      categoria: item.categoria ?? (item.produtoId ? 'peca' : 'servico'),
      produtoId: item.produtoId ?? null,
      servicoId: item.servicoId ?? null,
      ordem: i,
    }));
  }

  /** A soma das parcelas precisa bater com o total (diferença de até 1 centavo é aceita). */
  private validarParcelas(parcelas: { valor: number }[] | undefined, total: number) {
    if (!parcelas?.length) return;
    const soma = Math.round(parcelas.reduce((t, p) => t + Number(p.valor), 0) * 100) / 100;
    if (Math.abs(soma - total) > 0.011)
      throw new BadRequestException(`A soma das parcelas (R$ ${soma.toFixed(2)}) precisa ser igual ao total do orçamento (R$ ${total.toFixed(2)})`);
  }

  private parcelasData(parcelas: { vencimento: string; valor: number }[]) {
    return [...parcelas]
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .map((p, i) => ({ numero: i + 1, vencimento: new Date(`${p.vencimento.slice(0, 10)}T12:00:00Z`), valor: p.valor }));
  }

  async criar(dto: CreateOrcamentoDto, criadoPorId: string) {
    await this.validarAmbienteDoCliente(dto.ambienteId, dto.clienteId);
    await this.validarVisitaOrigem(dto.visitaOrigemId, dto.clienteId);
    await this.validarItensDoCadastro(dto.itens);
    const totais = calcularTotais(dto.itens, dto.descontoTipo, dto.desconto, dto.frete);
    this.validarParcelas(dto.parcelas, totais.total);
    const criado = await this.prisma.orcamento.create({
      data: {
        titulo: dto.titulo,
        observacoes: dto.observacoes,
        observacoesInternas: dto.observacoesInternas || null,
        validadeDias: dto.validadeDias ?? 30,
        clienteId: dto.clienteId,
        criadoPorId,
        ambienteId: dto.ambienteId ?? null,
        tipoOs: dto.tipoOs ?? 'corretiva',
        tipoServicoId: dto.tipoServicoId ?? null,
        modeloChecklistId: dto.modeloChecklistId ?? null,
        visitaOrigemId: dto.visitaOrigemId ?? null,
        descontoTipo: dto.descontoTipo ?? 'valor',
        desconto: dto.desconto ?? 0,
        frete: dto.frete ?? 0,
        formaPagamento: dto.formaPagamento || null,
        itens: { create: this.itensData(dto.itens) },
        ...(dto.parcelas?.length ? { parcelas: { create: this.parcelasData(dto.parcelas) } } : {}),
      },
      include: INCLUDE_FULL,
    });
    return { ...comTotais(criado), avisos: [] as string[] };
  }

  /** Edita em qualquer status. O estoque já baixado é conciliado com os novos itens. */
  async atualizar(id: string, dto: Partial<CreateOrcamentoDto>, usuarioId: string | null = null) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, include: { itens: true, parcelas: true } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');

    await this.validarAmbienteDoCliente(dto.ambienteId, orc.clienteId);
    await this.validarVisitaOrigem(dto.visitaOrigemId, orc.clienteId);
    if (dto.itens) await this.validarItensDoCadastro(dto.itens);

    const itensNovos = dto.itens ?? orc.itens;
    const tipoDesc = dto.descontoTipo ?? (orc.descontoTipo as 'valor' | 'percentual');
    const desc = dto.desconto ?? Number(orc.desconto);
    const frete = dto.frete ?? Number(orc.frete);
    const totais = calcularTotais(itensNovos, tipoDesc, desc, frete);
    this.validarParcelas(dto.parcelas, totais.total);
    // parcelas antigas que já não fecham com o novo total saem (evita documento inconsistente)
    const parcelasAntigasInvalidas = !dto.parcelas && orc.parcelas.length > 0
      && Math.abs(orc.parcelas.reduce((t, p) => t + Number(p.valor), 0) - totais.total) > 0.011;

    // devolve ao estoque o que este orçamento já baixou; depois de gravar, baixa de novo conforme os novos itens
    const mexeNosItens = !!dto.itens;
    const avisosPrevios = mexeNosItens ? await this.reconciliarEstoque(id, usuarioId, true) : [];

    await this.prisma.orcamento.update({
      where: { id },
      data: {
        ...(dto.ambienteId !== undefined ? { ambienteId: dto.ambienteId } : {}),
        ...(dto.visitaOrigemId !== undefined ? { visitaOrigemId: dto.visitaOrigemId } : {}),
        ...(dto.tipoOs ? { tipoOs: dto.tipoOs } : {}),
        ...(dto.tipoServicoId !== undefined ? { tipoServicoId: dto.tipoServicoId } : {}),
        ...(dto.modeloChecklistId !== undefined ? { modeloChecklistId: dto.modeloChecklistId } : {}),
        ...(dto.titulo    ? { titulo: dto.titulo }       : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        ...(dto.observacoesInternas !== undefined ? { observacoesInternas: dto.observacoesInternas || null } : {}),
        ...(dto.validadeDias ? { validadeDias: dto.validadeDias } : {}),
        ...(dto.descontoTipo ? { descontoTipo: dto.descontoTipo } : {}),
        ...(dto.desconto !== undefined ? { desconto: dto.desconto } : {}),
        ...(dto.frete !== undefined ? { frete: dto.frete } : {}),
        ...(dto.formaPagamento !== undefined ? { formaPagamento: dto.formaPagamento || null } : {}),
        ...(dto.itens ? { itens: { deleteMany: {}, create: this.itensData(dto.itens) } } : {}),
        ...(dto.parcelas
          ? { parcelas: { deleteMany: {}, create: this.parcelasData(dto.parcelas) } }
          : parcelasAntigasInvalidas ? { parcelas: { deleteMany: {} } } : {}),
      },
    });

    const avisos = [...avisosPrevios, ...(mexeNosItens ? await this.reconciliarEstoque(id, usuarioId) : [])];
    const atual = await this.prisma.orcamento.findUniqueOrThrow({ where: { id }, include: INCLUDE_FULL });
    return { ...comTotais(atual), avisos: [...avisos, ...(parcelasAntigasInvalidas ? ['As parcelas foram removidas porque o total mudou. Gere-as novamente.'] : [])] };
  }

  /**
   * Troca manual de status (qualquer direção). Aprovar baixa o estoque dos produtos e tenta gerar a O.S.;
   * sair de "aprovado" devolve o estoque.
   */
  async alterarStatus(id: string, status: OrcamentoStatus, usuarioId: string | null) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status === status) throw new BadRequestException('O orçamento já está com este status');
    await this.prisma.orcamento.update({
      where: { id },
      data: {
        status,
        aprovadoEm: status === 'aprovado' ? new Date() : null,
        rejeitadoEm: status === 'rejeitado' ? new Date() : null,
      },
    });
    const avisos = await this.reconciliarEstoque(id, usuarioId);
    if (status === 'aprovado') {
      await this.gerarOs(id).catch((err) => {
        avisos.push(`A O.S. não foi gerada automaticamente: ${err?.message ?? err}`);
      });
    }
    const atual = await this.prisma.orcamento.findUniqueOrThrow({ where: { id }, include: INCLUDE_FULL });
    return { ...comTotais(atual), avisos };
  }

  /**
   * Concilia a baixa de estoque dos itens-produto com o status: aprovado → saiu a quantidade inteira; outro status → nada saiu.
   * Cada item guarda o quanto já baixou, então repetir a chamada não baixa duas vezes. Falta de saldo vira aviso (o orçamento segue válido).
   * `zerar` devolve tudo (usado antes de trocar os itens).
   */
  async reconciliarEstoque(orcamentoId: string, usuarioId: string | null, zerar = false): Promise<string[]> {
    const orc = await this.prisma.orcamento.findUnique({ where: { id: orcamentoId }, include: { itens: true } });
    if (!orc) return [];
    const comProduto = orc.itens.filter((i) => i.produtoId);
    if (!comProduto.length) return [];
    const controlam = new Set(
      (await this.prisma.produto.findMany({ where: { id: { in: comProduto.map((i) => i.produtoId as string) } }, select: { id: true, controlaEstoque: true } }))
        .filter((p) => p.controlaEstoque).map((p) => p.id),
    );
    const aprovado = orc.status === 'aprovado' && !zerar;
    const avisos: string[] = [];
    const rotulo = `Orçamento #${String(orc.numero).padStart(4, '0')}`;

    for (const it of comProduto) {
      const alvo = aprovado ? Number(it.quantidade) : 0;
      const diff = Math.round((alvo - Number(it.estoqueBaixado)) * 1000) / 1000;
      if (Math.abs(diff) < 0.0005) continue;
      // produto que não controla estoque não tem saldo para mexer
      if (!controlam.has(it.produtoId as string) && diff > 0) continue;
      for (let tentativa = 1; ; tentativa++) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await this.produtos.aplicarMovimentoTx(
              tx, it.produtoId as string,
              { tipo: diff > 0 ? 'saida' : 'entrada', quantidade: Math.abs(diff), documento: rotulo, observacao: diff > 0 ? `Baixa pelo ${rotulo}` : `Devolução do ${rotulo}` },
              diff > 0 ? 'uso_orcamento' : 'devolucao', usuarioId, { orcamentoId },
            );
            await tx.orcamentoItem.update({ where: { id: it.id }, data: { estoqueBaixado: alvo } });
          });
          break;
        } catch (e) {
          if (e instanceof ConflictException && tentativa < 3) continue;
          if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException) {
            avisos.push(`${it.descricao}: ${diff > 0 ? 'estoque não baixado' : 'estoque não devolvido'} (${e.message})`);
            break;
          }
          throw e;
        }
      }
    }
    return avisos;
  }

  async enviar(id: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'rascunho')
      throw new BadRequestException('Apenas rascunhos podem ser enviados');

    const atual = await this.prisma.orcamento.update({
      where: { id },
      data: { status: OrcamentoStatus.enviado },
      include: INCLUDE_FULL,
    });
    return comTotais(atual);
  }

  async aprovar(token: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { tokenPublico: token } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'enviado')
      throw new BadRequestException('Este orçamento não está disponível para aprovação');

    const validade = new Date(orc.criadoEm.getTime() + orc.validadeDias * 86_400_000);
    if (validade < new Date())
      throw new BadRequestException('Este orçamento está vencido. Solicite uma nova proposta.');

    // Aprovação atômica: duas requisições simultâneas não aprovam (nem geram O.S.) duas vezes
    const { count } = await this.prisma.orcamento.updateMany({
      where: { id: orc.id, status: 'enviado' },
      data: { status: OrcamentoStatus.aprovado, aprovadoEm: new Date() },
    });
    if (count === 0)
      throw new BadRequestException('Este orçamento não está disponível para aprovação');

    // Baixa o estoque dos produtos (no contexto da empresa do orçamento: o link público não tem login)
    const baixar = () => this.reconciliarEstoque(orc.id, null).catch((err) => {
      this.logger.warn(`Orçamento ${orc.id}: baixa de estoque falhou: ${err?.message ?? err}`);
      return [] as string[];
    });
    const avisosEstoque = await (orc.empresaId ? runWithTenant(orc.empresaId, baixar) : baixar());
    if (avisosEstoque.length) this.logger.warn(`Orçamento ${orc.id} aprovado com avisos de estoque: ${avisosEstoque.join(' | ')}`);

    // Gera a O.S. na hora. Se não for possível (ex.: cliente com vários ambientes e nenhum
    // escolhido no orçamento), o orçamento continua aprovado e o admin gera a O.S. depois.
    await this.gerarOs(orc.id).catch((err) => {
      this.logger.warn(`Orçamento ${orc.id} aprovado, mas a O.S. não foi gerada: ${err?.message ?? err}`);
    });

    const atualizado = await this.prisma.orcamento.findUnique({ where: { id: orc.id }, include: INCLUDE_PUBLICO });
    return atualizado ? paraPublico(atualizado) : atualizado;
  }

  /**
   * Gera a O.S. de um orçamento aprovado (idempotente: se já existe, devolve a existente).
   * A O.S. nasce "aberta" para o admin fazer a triagem (técnico + data), com o checklist
   * do caso e os valores de mão de obra/peças vindos dos itens do orçamento.
   */
  async gerarOs(id: string, ambienteIdEscolhido?: string) {
    const orc = await this.prisma.orcamento.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'aprovado')
      throw new BadRequestException('Só é possível gerar O.S. de um orçamento aprovado');

    if (orc.ordemServicoId) {
      return this.prisma.ordemServico.findUnique({ where: { id: orc.ordemServicoId } });
    }

    // Ambiente: escolhido agora > definido no orçamento > único ambiente ativo do cliente
    let ambienteId = ambienteIdEscolhido ?? orc.ambienteId ?? null;
    if (!ambienteId) {
      const ambientes = await this.prisma.ambiente.findMany({
        where: { clienteId: orc.clienteId, deletedAt: null },
        select: { id: true },
        take: 2,
      });
      if (ambientes.length === 1) ambienteId = ambientes[0].id;
    }
    if (!ambienteId)
      throw new BadRequestException('Escolha o ambiente onde o serviço será executado para gerar a O.S.');

    await this.validarAmbienteDoCliente(ambienteId, orc.clienteId);
    const ambiente = await this.prisma.ambiente.findUnique({
      where: { id: ambienteId },
      include: { equipamentos: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (!ambiente) throw new NotFoundException('Ambiente não encontrado');

    const checklist = await resolverChecklistItens(this.prisma, {
      modeloChecklistId: orc.modeloChecklistId,
      tipo: orc.tipoOs,
      tipoServicoId: orc.tipoServicoId,
    });

    // O desconto do orçamento é rateado entre mão de obra e peças (o frete não entra na O.S.)
    const t = calcularTotais(orc.itens, orc.descontoTipo, Number(orc.desconto), Number(orc.frete));
    const fator = t.subtotal > 0 ? (t.subtotal - t.descontoValor) / t.subtotal : 1;
    const total = (cat: string) =>
      Math.round(
        orc.itens
          .filter((i) => i.categoria === cat)
          .reduce((soma, i) => soma + Number(i.quantidade) * Number(i.precoUnitario), 0) * fator * 100,
      ) / 100;
    const valorMaoObra = total('servico');
    const valorPecas = total('peca');

    // Aberta e agendada provisoriamente para amanhã; a triagem define técnico e data reais
    const provisoria = new Date();
    provisoria.setDate(provisoria.getDate() + 1);
    provisoria.setHours(12, 0, 0, 0);

    const osCriada = await this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          ambienteId: ambiente.id,
          status: 'aberta',
          tipo: orc.tipoOs,
          origem: 'orcamento_aprovado',
          dataAgendamento: provisoria,
          tipoServicoId: orc.tipoServicoId,
          valorMaoObra: valorMaoObra > 0 ? valorMaoObra : null,
          valorPecas: valorPecas > 0 ? valorPecas : null,
          observacoesGerais: `Gerada do orçamento #${String(orc.numero).padStart(4, '0')} — ${orc.titulo}`,
          empresaId: orc.empresaId,
        },
      });

      if (ambiente.equipamentos.length > 0) {
        await tx.ordemServicoItem.createMany({
          data: ambiente.equipamentos.map((eq) => ({
            ordemServicoId: os.id,
            equipamentoId: eq.id,
            statusItem: 'pendente' as const,
            checklistSnapshot: checklist,
          })),
        });
      }

      // Vincula só se ainda não houver O.S. (protege contra duas gerações simultâneas)
      const { count } = await tx.orcamento.updateMany({
        where: { id: orc.id, ordemServicoId: null },
        data: { ordemServicoId: os.id, ambienteId: ambiente.id },
      });
      if (count === 0) throw new BadRequestException('Este orçamento já gerou uma O.S.');

      return os;
    });
    await this.agenda.sincronizarOs(osCriada.id);
    return osCriada;
  }

  /** A visita de origem precisa ser uma O.S. do mesmo cliente, de um tipo de serviço marcado como visita. */
  private async validarVisitaOrigem(visitaId: string | null | undefined, clienteId: string) {
    if (!visitaId) return;
    const os = await this.prisma.ordemServico.findFirst({
      where: { id: visitaId, ambiente: { clienteId }, tipoServico: { ehVisita: true } },
      select: { id: true },
    });
    if (!os) throw new BadRequestException('Visita de origem inválida: escolha uma visita deste cliente');
  }

  /** Visitas concluídas dos últimos 180 dias, para escolher a origem ao criar um orçamento. */
  async visitasRecentes() {
    const desde = new Date(Date.now() - 180 * 86400_000);
    const visitas = await this.prisma.ordemServico.findMany({
      where: { tipoServico: { ehVisita: true }, status: 'concluida', dataConclusao: { gte: desde } },
      orderBy: { dataConclusao: 'desc' },
      take: 500,
      select: { id: true, numero: true, dataConclusao: true, ambiente: { select: { clienteId: true } }, tipoServico: { select: { sigla: true } } },
    });
    return visitas.map((v) => ({
      id: v.id,
      clienteId: v.ambiente.clienteId,
      numero: v.numero,
      sigla: v.tipoServico?.sigla ?? 'OS',
      dataConclusao: v.dataConclusao,
    }));
  }

  /**
   * Funil de conversão: das visitas concluídas no período, quantas geraram orçamento e quantas viraram serviço fechado
   * (orçamento aprovado). Vale para qualquer empresa: "visita" é o tipo de serviço marcado como tal na configuração.
   */
  async funil(de?: string, ate?: string) {
    const fim = ate ? new Date(`${ate}T23:59:59.999-03:00`) : new Date();
    const ini = de ? new Date(`${de}T00:00:00-03:00`) : new Date(fim.getTime() - 90 * 86400_000);
    const visitas = await this.prisma.ordemServico.findMany({
      where: { tipoServico: { ehVisita: true }, status: 'concluida', dataConclusao: { gte: ini, lte: fim } },
      orderBy: { dataConclusao: 'desc' },
      take: 1000,
      select: {
        id: true, numero: true, dataConclusao: true,
        tipoServico: { select: { sigla: true } },
        ambiente: { select: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } } } },
        tecnico: { select: { nome: true, email: true } },
      },
    });
    const orcs = visitas.length
      ? await this.prisma.orcamento.findMany({
          where: { visitaOrigemId: { in: visitas.map((v) => v.id) } },
          select: {
            id: true, numero: true, status: true, titulo: true, visitaOrigemId: true,
            descontoTipo: true, desconto: true, frete: true,
            itens: { select: { quantidade: true, precoUnitario: true } },
            ordemServico: { select: { id: true, numero: true, tipoServico: { select: { sigla: true } } } },
          },
        })
      : [];
    const valorDe = (o: (typeof orcs)[number]) => calcularTotais(o.itens, o.descontoTipo, Number(o.desconto), Number(o.frete)).total;

    const linhas = visitas.map((v) => {
      const doVisita = orcs.filter((o) => o.visitaOrigemId === v.id);
      const aprovado = doVisita.find((o) => o.status === 'aprovado');
      const aberto = doVisita.filter((o) => o.status === 'enviado' || o.status === 'rascunho');
      const resultado = aprovado ? 'fechada' : aberto.length ? 'em_aberto' : doVisita.length ? 'perdida' : 'sem_orcamento';
      return {
        id: v.id,
        numero: v.numero,
        sigla: v.tipoServico?.sigla ?? 'OS',
        dataConclusao: v.dataConclusao,
        cliente: v.ambiente.cliente,
        tecnico: v.tecnico ? (v.tecnico.nome ?? v.tecnico.email) : null,
        resultado,
        valor: aprovado ? valorDe(aprovado) : aberto.length ? Math.max(...aberto.map(valorDe)) : 0,
        orcamentos: doVisita.map((o) => ({
          id: o.id, numero: o.numero, status: o.status, titulo: o.titulo, valor: valorDe(o),
          ordemServico: o.ordemServico
            ? { id: o.ordemServico.id, numero: o.ordemServico.numero, sigla: o.ordemServico.tipoServico?.sigla ?? 'OS' }
            : null,
        })),
      };
    });
    const conta = (r: string) => linhas.filter((l) => l.resultado === r).length;
    const total = linhas.length;
    return {
      periodo: { de: ini.toISOString(), ate: fim.toISOString() },
      totais: {
        visitas: total,
        comOrcamento: total - conta('sem_orcamento'),
        fechadas: conta('fechada'),
        emAberto: conta('em_aberto'),
        perdidas: conta('perdida'),
        semOrcamento: conta('sem_orcamento'),
        taxaConversao: total ? Math.round((conta('fechada') / total) * 100) : null,
        valorFechado: linhas.filter((l) => l.resultado === 'fechada').reduce((t, l) => t + l.valor, 0),
        valorEmAberto: linhas.filter((l) => l.resultado === 'em_aberto').reduce((t, l) => t + l.valor, 0),
      },
      visitas: linhas,
    };
  }

  private async validarAmbienteDoCliente(ambienteId: string | null | undefined, clienteId: string) {
    if (!ambienteId) return;
    const ambiente = await this.prisma.ambiente.findFirst({
      where: { id: ambienteId, clienteId, deletedAt: null },
      select: { id: true },
    });
    if (!ambiente) throw new BadRequestException('O ambiente escolhido não pertence a este cliente');
  }

  async rejeitar(token: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { tokenPublico: token } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'enviado')
      throw new BadRequestException('Este orçamento não está disponível para resposta');

    return this.prisma.orcamento.update({
      where: { id: orc.id },
      data: { status: OrcamentoStatus.rejeitado, rejeitadoEm: new Date() },
      include: INCLUDE_PUBLICO,
    }).then(paraPublico);
  }

  async listarDoCliente(usuarioId: string | undefined) {
    // Sem usuário o Prisma ignoraria o filtro e devolveria o primeiro cliente do banco
    if (!usuarioId) return [];
    const cliente = await this.prisma.cliente.findFirst({ where: { usuarioId, deletedAt: null } });
    if (!cliente) return [];
    return this.prisma.orcamento.findMany({
      // Cliente só vê orçamentos já enviados (rascunho é interno)
      where: { clienteId: cliente.id, status: { not: 'rascunho' } },
      include: {
        itens: { select: { id: true, descricao: true, quantidade: true, unidade: true, precoUnitario: true, categoria: true }, orderBy: ORDEM_ITENS },
        parcelas: { orderBy: { numero: 'asc' }, select: { id: true, numero: true, vencimento: true, valor: true } },
        criadoPor: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    }).then((lista) => lista.map(({ observacoesInternas, ...o }) => { void observacoesInternas; return comTotais(o); }));
  }

  /** Exclui em qualquer status, exceto se já gerou O.S. Devolve ao estoque o que o orçamento tinha baixado. */
  async excluir(id: string, usuarioId: string | null = null) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, include: { ordemServico: { select: { numero: true } } } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.ordemServicoId)
      throw new BadRequestException(`Este orçamento gerou a O.S. #${String(orc.ordemServico?.numero ?? '').padStart(4, '0')}. Exclua ou cancele a O.S. antes de excluir o orçamento.`);

    const avisos = await this.reconciliarEstoque(id, usuarioId, true);
    if (avisos.length)
      throw new BadRequestException(`Não foi possível devolver o estoque: ${avisos.join('; ')}. Nada foi excluído.`);
    await this.prisma.orcamento.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Anexos (guardados no banco; até 5 MB cada) ───
  async anexar(id: string, dto: AnexoOrcamentoDto) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, select: { id: true } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (!TIPOS_ANEXO.includes(dto.tipo)) throw new BadRequestException('Tipo de arquivo não permitido (use PDF, imagem, Word ou Excel)');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(dto.conteudoBase64)) throw new BadRequestException('Arquivo inválido');
    const conteudo = Buffer.from(dto.conteudoBase64, 'base64');
    if (conteudo.length === 0) throw new BadRequestException('Arquivo vazio');
    if (conteudo.length > MAX_ANEXO_BYTES) throw new BadRequestException('Arquivo maior que 3 MB');
    if ((await this.prisma.orcamentoAnexo.count({ where: { orcamentoId: id } })) >= MAX_ANEXOS)
      throw new BadRequestException(`Limite de ${MAX_ANEXOS} anexos por orçamento`);
    const nome = dto.nome.replace(/[\\/\r\n"]/g, '_').slice(0, 255);
    return this.prisma.orcamentoAnexo.create({
      data: { orcamentoId: id, nome, tipo: dto.tipo, tamanho: conteudo.length, conteudo },
      select: { id: true, nome: true, tipo: true, tamanho: true, criadoEm: true },
    });
  }

  async baixarAnexo(id: string, anexoId: string) {
    // o orçamento é lido pelo cliente com filtro de empresa: garante que o anexo é da empresa
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, select: { id: true } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    const anexo = await this.prisma.orcamentoAnexo.findFirst({ where: { id: anexoId, orcamentoId: id } });
    if (!anexo) throw new NotFoundException('Anexo não encontrado');
    return anexo;
  }

  async removerAnexo(id: string, anexoId: string) {
    await this.baixarAnexo(id, anexoId);
    await this.prisma.orcamentoAnexo.delete({ where: { id: anexoId } });
    return { ok: true };
  }
}
