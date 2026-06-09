import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModeloChecklistDto } from './dto/create-modelo-checklist.dto';

@Injectable()
export class ModelosChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.modeloChecklist.findMany({ orderBy: { nome: 'asc' } });
  }

  async findOne(id: string) {
    const m = await this.prisma.modeloChecklist.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Modelo de checklist não encontrado');
    return m;
  }

  create(dto: CreateModeloChecklistDto) {
    return this.prisma.modeloChecklist.create({
      data: { nome: dto.nome, itens: dto.itens as unknown as Prisma.InputJsonValue },
    });
  }

  async update(id: string, dto: CreateModeloChecklistDto) {
    await this.findOne(id);
    return this.prisma.modeloChecklist.update({
      where: { id },
      data: { nome: dto.nome, itens: dto.itens as unknown as Prisma.InputJsonValue },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.modeloChecklist.delete({ where: { id } });
  }
}
