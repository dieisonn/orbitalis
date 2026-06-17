import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clienteId?: string) {
    return this.prisma.contrato.findMany({
      where: clienteId ? { clienteId } : undefined,
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
      orderBy: { vigenciaFim: 'asc' },
    });
  }

  async findOne(id: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');
    return contrato;
  }

  async create(data: {
    clienteId: string;
    descricao: string;
    valorMensal?: number;
    vigenciaInicio: string;
    vigenciaFim: string;
    numOsIncluidas?: number;
    observacoes?: string;
  }) {
    return this.prisma.contrato.create({
      data: {
        clienteId: data.clienteId,
        descricao: data.descricao,
        valorMensal: data.valorMensal ?? null,
        vigenciaInicio: new Date(data.vigenciaInicio),
        vigenciaFim: new Date(data.vigenciaFim),
        numOsIncluidas: data.numOsIncluidas ?? null,
        observacoes: data.observacoes ?? null,
      },
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
    });
  }

  async update(id: string, data: Partial<{
    descricao: string;
    valorMensal: number | null;
    vigenciaInicio: string;
    vigenciaFim: string;
    numOsIncluidas: number | null;
    observacoes: string | null;
    ativo: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.contrato.update({
      where: { id },
      data: {
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.valorMensal !== undefined && { valorMensal: data.valorMensal }),
        ...(data.vigenciaInicio !== undefined && { vigenciaInicio: new Date(data.vigenciaInicio) }),
        ...(data.vigenciaFim !== undefined && { vigenciaFim: new Date(data.vigenciaFim) }),
        ...(data.numOsIncluidas !== undefined && { numOsIncluidas: data.numOsIncluidas }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contrato.delete({ where: { id } });
  }
}
