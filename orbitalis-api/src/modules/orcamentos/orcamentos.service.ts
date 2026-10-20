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
    empresaId, criadoPorId, clienteId, ambienteId, tipoServicoId, modeloChecklistId, ordemServicoId, ...visivel
  } = orc;
  void empresaId; void criadoPorId; void clienteId; void ambienteId;
  void tipoServicoId; void modeloChecklistId; void ordemServicoId;
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
    return orc;
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

    return this.prisma.orcamento.update({
      where: { id },
      data: {
        ...(dto.ambienteId !== undefined ? { ambienteId: dto.ambienteId } : {}),
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
