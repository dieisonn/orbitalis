import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';

@Injectable()
export class AmbientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAmbienteDto) {
    return this.prisma.ambiente.create({ data: dto });
  }

  findAll() {
    return this.prisma.ambiente.findMany({
      where: { deletedAt: null },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
  }

  async findOne(id: string) {
    const ambiente = await this.prisma.ambiente.findFirst({
      where: { id, deletedAt: null },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
    if (!ambiente) throw new NotFoundException('Ambiente não encontrado');
    return ambiente;
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
