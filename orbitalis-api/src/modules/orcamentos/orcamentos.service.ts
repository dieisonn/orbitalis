import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrcamentoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { AgendaService } from '../agenda/agenda.service';
import { resolverChecklistItens } from '../../common/checklist-resolver';

// Dados que o cliente pode ver pelo link público (sem informações internas da operação)
const INCLUDE_PUBLICO = {
  cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true, endereco: true, telefone: true } },
  criadoPor: { select: { id: true, nome: true, email: true } },
  itens: { orderBy: { descricao: 'asc' as const } },
} as const;

// Visão do admin: inclui como a O.S. será/foi gerada
const INCLUDE_FULL = {
  ...INCLUDE_PUBLICO,
  ambiente: { select: { id: true, nome: true } },
  tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true } },
  modeloChecklist: { select: { id: true, nome: true } },
  ordemServico: { select: { id: true, numero: true, status: true } },
} as const;

// O link público mostra a proposta; ids e vínculos internos ficam de fora
function paraPublico<T extends Record<string, any>>(orc: T) {
  const {
    empresaId, criadoPorId, clienteId, ambienteId, tipoServicoId, modeloChecklistId, ordemServicoId, visitaOrigemId, ...visivel
  } = orc;
  void empresaId; void criadoPorId; void clienteId; void ambienteId;
  void tipoServicoId; void modeloChecklistId; void ordemServicoId; void visitaOrigemId;
  return visivel;
}

@Injectable()
export class OrcamentosService {
  private readonly logger = new Logger(OrcamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: AgendaService,
  ) {}

  async listar(clienteId?: string, status?: OrcamentoStatus) {
    return this.prisma.orcamento.findMany({
      where: {
        ...(clienteId ? { clienteId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        ordemServico: { select: { id: true, numero: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
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
    return { ...orc, visitaOrigem };
  }

  async buscarPorToken(token: string) {
    const orc = await this.prisma.orcamento.findUnique({
      where: { tokenPublico: token },
      include: INCLUDE_PUBLICO,
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    return paraPublico(orc);
  }

  async criar(dto: CreateOrcamentoDto, criadoPorId: string) {
    await this.validarAmbienteDoCliente(dto.ambienteId, dto.clienteId);
    await this.validarVisitaOrigem(dto.visitaOrigemId, dto.clienteId);
    return this.prisma.orcamento.create({
      data: {
        titulo: dto.titulo,
        observacoes: dto.observacoes,
        validadeDias: dto.validadeDias ?? 30,
        clienteId: dto.clienteId,
        criadoPorId,
        ambienteId: dto.ambienteId ?? null,
        tipoOs: dto.tipoOs ?? 'corretiva',
        tipoServicoId: dto.tipoServicoId ?? null,
        modeloChecklistId: dto.modeloChecklistId ?? null,
        visitaOrigemId: dto.visitaOrigemId ?? null,
        itens: {
          create: dto.itens.map((item) => ({
            descricao: item.descricao,
            unidade: item.unidade ?? 'un',
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            categoria: item.categoria ?? 'servico',
          })),
        },
      },
      include: INCLUDE_FULL,
    });
  }

  async atualizar(id: string, dto: Partial<CreateOrcamentoDto>) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'rascunho')
      throw new BadRequestException('Apenas orçamentos em rascunho podem ser editados');

    await this.validarAmbienteDoCliente(dto.ambienteId, orc.clienteId);
    await this.validarVisitaOrigem(dto.visitaOrigemId, orc.clienteId);

    return this.prisma.orcamento.update({
      where: { id },
      data: {
        ...(dto.ambienteId !== undefined ? { ambienteId: dto.ambienteId } : {}),
        ...(dto.visitaOrigemId !== undefined ? { visitaOrigemId: dto.visitaOrigemId } : {}),
        ...(dto.tipoOs ? { tipoOs: dto.tipoOs } : {}),
        ...(dto.tipoServicoId !== undefined ? { tipoServicoId: dto.tipoServicoId } : {}),
        ...(dto.modeloChecklistId !== undefined ? { modeloChecklistId: dto.modeloChecklistId } : {}),
        ...(dto.titulo    ? { titulo: dto.titulo }       : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        ...(dto.validadeDias ? { validadeDias: dto.validadeDias } : {}),
        ...(dto.itens ? {
          itens: {
            deleteMany: {},
            create: dto.itens.map((item) => ({
              descricao: item.descricao,
              unidade: item.unidade ?? 'un',
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              categoria: item.categoria ?? 'servico',
            })),
          },
        } : {}),
      },
      include: INCLUDE_FULL,
    });
  }

  async enviar(id: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'rascunho')
      throw new BadRequestException('Apenas rascunhos podem ser enviados');

    return this.prisma.orcamento.update({
      where: { id },
      data: { status: OrcamentoStatus.enviado },
      include: INCLUDE_FULL,
    });
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

    const total = (cat: string) =>
      orc.itens
        .filter((i) => i.categoria === cat)
        .reduce((soma, i) => soma + Number(i.quantidade) * Number(i.precoUnitario), 0);
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
      where: { id: visitaId, clienteId, tipoServico: { ehVisita: true } },
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
      select: { id: true, numero: true, clienteId: true, dataConclusao: true, tipoServico: { select: { sigla: true } } },
    });
    return visitas.map((v) => ({
      id: v.id,
      clienteId: v.clienteId,
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
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        tecnico: { select: { nome: true, email: true } },
      },
    });
    const orcs = visitas.length
      ? await this.prisma.orcamento.findMany({
          where: { visitaOrigemId: { in: visitas.map((v) => v.id) } },
          select: {
            id: true, numero: true, status: true, titulo: true, visitaOrigemId: true,
            itens: { select: { quantidade: true, precoUnitario: true } },
            ordemServico: { select: { id: true, numero: true, tipoServico: { select: { sigla: true } } } },
          },
        })
      : [];
    const valorDe = (o: (typeof orcs)[number]) => o.itens.reduce((t, i) => t + Number(i.quantidade) * Number(i.precoUnitario), 0);

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
        cliente: v.cliente,
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
        itens: true,
        criadoPor: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async excluir(id: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (!['rascunho', 'rejeitado', 'expirado'].includes(orc.status))
      throw new BadRequestException('Não é possível excluir um orçamento enviado ou aprovado');

    await this.prisma.orcamento.delete({ where: { id } });
    return { ok: true };
  }
}
