import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipamentoDto } from './dto/create-equipamento.dto';
import { SubstituirQrDto } from './dto/substituir-qr.dto';

@Injectable()
export class EquipamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private gerarCodigoQr(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async create(dto: CreateEquipamentoDto) {
    const codigoQr = this.gerarCodigoQr();
    return this.prisma.equipamento.create({
      data: { ...dto, codigoQr },
    });
  }

  findAll() {
    return this.prisma.equipamento.findMany({ where: { deletedAt: null } });
  }

  async findOne(id: string) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
      include: { ambiente: { include: { cliente: true } } },
    });
    if (!equipamento) throw new NotFoundException('Equipamento não encontrado');
    return equipamento;
  }

  async findByQr(codigoQr: string) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: { codigoQr, deletedAt: null },
      include: { ambiente: { include: { cliente: true } } },
    });
    if (!equipamento) throw new NotFoundException('QR Code não encontrado');
    return equipamento;
  }

  async update(id: string, data: { nome?: string; marca?: string; modelo?: string | null; numeroSerie?: string | null; tipoEquipamento?: string }) {
    await this.findOne(id);
    return this.prisma.equipamento.update({ where: { id }, data });
  }

  async substituirQr(id: string, dto: SubstituirQrDto) {
    await this.findOne(id);
    return this.prisma.equipamento.update({
      where: { id },
      data: { codigoQr: dto.novoCodigoQr },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete (§6.5)
    return this.prisma.equipamento.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
