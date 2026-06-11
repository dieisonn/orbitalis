import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModeloChecklistDto } from './dto/create-modelo-checklist.dto';

const PMOC_SPLIT_HIWALL_ITENS = [
  { id: 'pmoc-01', descricao: 'Verificar e limpar filtros de ar da unidade interna', obrigatorio: true,  tipo: 'texto' },
  { id: 'pmoc-02', descricao: 'Limpar serpentina evaporadora (unidade interna)', obrigatorio: true,  tipo: 'texto' },
  { id: 'pmoc-03', descricao: 'Limpar serpentina condensadora (unidade externa)', obrigatorio: true,  tipo: 'texto' },
  { id: 'pmoc-04', descricao: 'Verificar e limpar bandeja de condensado', obrigatorio: true,  tipo: 'texto' },
  { id: 'pmoc-05', descricao: 'Verificar e limpar dreno de condensado / sifão', obrigatorio: true,  tipo: 'texto' },
  { id: 'pmoc-06', descricao: 'Temperatura de insuflamento (°C)', obrigatorio: true,  tipo: 'numero', unidade: '°C' },
  { id: 'pmoc-07', descricao: 'Temperatura de retorno (°C)', obrigatorio: true,  tipo: 'numero', unidade: '°C' },
  { id: 'pmoc-08', descricao: 'Corrente elétrica — unidade interna (A)', obrigatorio: true,  tipo: 'numero', unidade: 'A' },
  { id: 'pmoc-09', descricao: 'Tensão elétrica (V)', obrigatorio: true,  tipo: 'numero', unidade: 'V' },
  { id: 'pmoc-10', descricao: 'Verificar conexões elétricas e aperto de bornes', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Conforme', 'Reaperto realizado', 'Com defeito'] },
  { id: 'pmoc-11', descricao: 'Verificar estado e funcionamento do capacitor', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['OK', 'Substituído', 'Com defeito'] },
  { id: 'pmoc-12', descricao: 'Verificar estado das pás do ventilador (interna e externa)', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['OK', 'Com deformação', 'Substituído'] },
  { id: 'pmoc-13', descricao: 'Verificar ruídos e vibrações anormais', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Sem ruídos', 'Ruído identificado e corrigido', 'Ruído persistente — aguardando peça'] },
  { id: 'pmoc-14', descricao: 'Pressão de sucção (bar)', obrigatorio: false, tipo: 'numero', unidade: 'bar' },
  { id: 'pmoc-15', descricao: 'Pressão de descarga (bar)', obrigatorio: false, tipo: 'numero', unidade: 'bar' },
  { id: 'pmoc-16', descricao: 'Verificar vazamento de fluido refrigerante', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Sem vazamento', 'Vazamento detectado e corrigido', 'Vazamento — carga necessária'] },
  { id: 'pmoc-17', descricao: 'Verificar isolamento térmico das tubulações', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['Conforme', 'Degradado — recomendado substituição', 'Substituído'] },
  { id: 'pmoc-18', descricao: 'Verificar fixação e nivelamento das unidades', obrigatorio: false, tipo: 'texto' },
  { id: 'pmoc-19', descricao: 'Testar todos os modos de operação (frio, quente, ventilação)', obrigatorio: false, tipo: 'multipla_escolha', opcoes: ['Frio OK', 'Quente OK', 'Ventilação OK', 'Automático OK', 'Modo com falha'] },
  { id: 'pmoc-20', descricao: 'Registrar leituras e assinar laudo de manutenção', obrigatorio: true,  tipo: 'texto' },
];

const ANVISA_ITENS = [
  { id: 'anvisa-01', descricao: 'Verificar e limpar filtros de ar (classes G1, G2 ou F5)', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Limpos e OK', 'Limpos com desgaste', 'Substituídos'] },
  { id: 'anvisa-02', descricao: 'Limpar e desinfetar serpentina evaporadora', obrigatorio: true,  tipo: 'texto' },
  { id: 'anvisa-03', descricao: 'Limpar e desinfetar bandeja de condensado', obrigatorio: true,  tipo: 'texto' },
  { id: 'anvisa-04', descricao: 'Verificar e eliminar água estagnada em bandejas e drenos', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Sem água estagnada', 'Removida', 'Tratada com biocida'] },
  { id: 'anvisa-05', descricao: 'Temperatura de insuflamento de ar (°C)', obrigatorio: true,  tipo: 'numero', unidade: '°C' },
  { id: 'anvisa-06', descricao: 'Temperatura ambiente do local atendido (°C)', obrigatorio: true,  tipo: 'numero', unidade: '°C' },
  { id: 'anvisa-07', descricao: 'Umidade relativa do ar (%)', obrigatorio: true,  tipo: 'numero', unidade: '%' },
  { id: 'anvisa-08', descricao: 'Concentração de CO₂ no ambiente (ppm)', obrigatorio: false, tipo: 'numero', unidade: 'ppm' },
  { id: 'anvisa-09', descricao: 'Verificar presença de odores, mofo ou contaminantes visíveis', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Não detectado', 'Detectado e tratado', 'Detectado — aguardando ação'] },
  { id: 'anvisa-10', descricao: 'Inspecionar dutos de ar (sujidade, biofilme, obstrução)', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['Conforme', 'Limpeza realizada', 'Higienização com biocida'] },
  { id: 'anvisa-11', descricao: 'Limpar difusores, grelhas e registros de ar', obrigatorio: true,  tipo: 'texto' },
  { id: 'anvisa-12', descricao: 'Verificar estanqueidade e vedação do sistema', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['Conforme', 'Vazamento corrigido', 'Vazamento pendente'] },
  { id: 'anvisa-13', descricao: 'Verificar funcionamento da entrada de ar externo (VAO/damper)', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Operando normalmente', 'Ajustado', 'Com defeito', 'Não aplicável'] },
  { id: 'anvisa-14', descricao: 'Verificar funcionamento do exaustor / retorno de ar', obrigatorio: true,  tipo: 'escolha_unica', opcoes: ['Operando normalmente', 'Com defeito', 'Não aplicável'] },
  { id: 'anvisa-15', descricao: 'Aplicar produto biocida nos componentes internos (se indicado)', obrigatorio: false, tipo: 'texto' },
  { id: 'anvisa-16', descricao: 'Registrar e assinar Relatório de Manutenção — RDC ANVISA 09/2003', obrigatorio: true,  tipo: 'texto' },
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

  async seedAnvisa() {
    const nome = 'ANVISA — Climatização em Serviços de Saúde (RDC 09/2003)';
    const existing = await this.prisma.modeloChecklist.findFirst({ where: { nome } });
    if (existing) return existing;
    return this.prisma.modeloChecklist.create({
      data: { nome, itens: ANVISA_ITENS as unknown as Prisma.InputJsonValue },
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
