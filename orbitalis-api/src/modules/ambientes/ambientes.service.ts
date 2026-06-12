import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';

@Injectable()
export class AmbientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAmbienteDto) {
    return this.prisma.ambiente.create({ data: dto });
  }

  async findAll(page = 1, perPage = 20, clienteId?: string) {
    const skip = (page - 1) * perPage;
    const where = { deletedAt: null, ...(clienteId ? { clienteId } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.ambiente.findMany({
        where,
        include: {
          equipamentos: { where: { deletedAt: null }, orderBy: { nome: 'asc' } },
          cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        },
        orderBy: [{ cliente: { razaoSocial: 'asc' } }, { nome: 'asc' }],
        skip,
        take: perPage,
      }),
      this.prisma.ambiente.count({ where }),
    ]);
    return { data, total, page, perPage };
  }

  async findOne(id: string) {
    const ambiente = await this.prisma.ambiente.findFirst({
      where: { id, deletedAt: null },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
    if (!ambiente) throw new NotFoundException('Ambiente não encontrado');
    return ambiente;
  }

  async update(id: string, data: { nome?: string; metrosQuadrados?: number; capacidadeTermica?: string; localizacaoInterna?: string }) {
    await this.findOne(id);
    return this.prisma.ambiente.update({ where: { id }, data });
  }

  async findByCliente(clienteId: string) {
    return this.prisma.ambiente.findMany({
      where: { clienteId, deletedAt: null },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete (§6.5)
    return this.prisma.ambiente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
