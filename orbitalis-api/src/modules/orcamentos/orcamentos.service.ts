import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrcamentoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';

const INCLUDE_FULL = {
  cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true, endereco: true, telefone: true } },
  criadoPor: { select: { id: true, nome: true, email: true } },
  itens: { orderBy: { descricao: 'asc' as const } },
} as const;

@Injectable()
export class OrcamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(clienteId?: string, status?: OrcamentoStatus) {
    return this.prisma.orcamento.findMany({
      where: {
        ...(clienteId ? { clienteId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
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
      include: INCLUDE_FULL,
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    return orc;
  }

  async criar(dto: CreateOrcamentoDto, criadoPorId: string) {
    return this.prisma.orcamento.create({
      data: {
        titulo: dto.titulo,
        observacoes: dto.observacoes,
        validadeDias: dto.validadeDias ?? 30,
        clienteId: dto.clienteId,
        criadoPorId,
        itens: {
          create: dto.itens.map((item) => ({
            descricao: item.descricao,
            unidade: item.unidade ?? 'un',
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
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

    return this.prisma.orcamento.update({
      where: { id },
      data: {
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

    return this.prisma.orcamento.update({
      where: { id: orc.id },
      data: { status: OrcamentoStatus.aprovado, aprovadoEm: new Date() },
      include: INCLUDE_FULL,
    });
  }

  async rejeitar(token: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { tokenPublico: token } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.status !== 'enviado')
      throw new BadRequestException('Este orçamento não está disponível para resposta');

    return this.prisma.orcamento.update({
      where: { id: orc.id },
      data: { status: OrcamentoStatus.rejeitado, rejeitadoEm: new Date() },
      include: INCLUDE_FULL,
    });
  }

  async listarDoCliente(usuarioId: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { usuarioId } });
    if (!cliente) return [];
    return this.prisma.orcamento.findMany({
      where: { clienteId: cliente.id },
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
