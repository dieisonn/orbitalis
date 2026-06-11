import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModeloChecklistDto } from './dto/create-modelo-checklist.dto';

const PMOC_SPLIT_HIWALL_ITENS = [
  { id: 'pmoc-01', descricao: 'Verificar e limpar filtros de ar da unidade interna', obrigatorio: true },
  { id: 'pmoc-02', descricao: 'Limpar serpentina evaporadora (unidade interna)', obrigatorio: true },
  { id: 'pmoc-03', descricao: 'Limpar serpentina condensadora (unidade externa)', obrigatorio: true },
  { id: 'pmoc-04', descricao: 'Verificar e limpar bandeja de condensado', obrigatorio: true },
  { id: 'pmoc-05', descricao: 'Verificar e limpar dreno de condensado / sifão', obrigatorio: true },
  { id: 'pmoc-06', descricao: 'Medir temperatura de insuflamento e retorno (ΔT)', obrigatorio: true },
  { id: 'pmoc-07', descricao: 'Verificar tensão e corrente elétrica (A e V)', obrigatorio: true },
  { id: 'pmoc-08', descricao: 'Verificar conexões elétricas e aperto de bornes', obrigatorio: true },
  { id: 'pmoc-09', descricao: 'Verificar estado e funcionamento do capacitor', obrigatorio: false },
  { id: 'pmoc-10', descricao: 'Verificar estado das pás do ventilador (interna e externa)', obrigatorio: false },
  { id: 'pmoc-11', descricao: 'Verificar ruídos e vibrações anormais', obrigatorio: true },
  { id: 'pmoc-12', descricao: 'Verificar pressões de sucção e descarga do sistema', obrigatorio: false },
  { id: 'pmoc-13', descricao: 'Verificar vazamento de fluido refrigerante', obrigatorio: true },
  { id: 'pmoc-14', descricao: 'Verificar isolamento térmico das tubulações', obrigatorio: false },
  { id: 'pmoc-15', descricao: 'Verificar fixação e nivelamento das unidades', obrigatorio: false },
  { id: 'pmoc-16', descricao: 'Limpar gabinete externo da unidade interna', obrigatorio: false },
  { id: 'pmoc-17', descricao: 'Limpar área ao redor da unidade condensadora', obrigatorio: false },
  { id: 'pmoc-18', descricao: 'Testar todos os modos de operação (frio, quente, ventilação)', obrigatorio: false },
  { id: 'pmoc-19', descricao: 'Verificar funcionamento do controle remoto / painel', obrigatorio: false },
  { id: 'pmoc-20', descricao: 'Registrar leituras e assinar laudo de manutenção', obrigatorio: true },
];

@Injectable()
export class ModelosChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.modeloChecklist.findMany({ orderBy: { nome: 'asc' }, skip, take: perPage }),
      this.prisma.modeloChecklist.count(),
    ]);
    return { data, total, page, perPage };
  }

  async seedPmocSplitHiwall() {
    const nome = 'PMOC Split Hi-Wall — Padrão ABRAVA';
    const existing = await this.prisma.modeloChecklist.findFirst({ where: { nome } });
    if (existing) return existing;
    return this.prisma.modeloChecklist.create({
      data: { nome, itens: PMOC_SPLIT_HIWALL_ITENS as unknown as Prisma.InputJsonValue },
    });
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
