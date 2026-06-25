import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipamentoDto } from './dto/create-equipamento.dto';
import { SubstituirQrDto } from './dto/substituir-qr.dto';

type UpdateEquipamentoData = {
  nome?: string;
  marca?: string;
  modelo?: string | null;
  numeroSerie?: string | null;
  tipoEquipamento?: string;
  potencia?: string | null;
  dataInstalacao?: string | null;
  condicao?: string | null;
  diagnosticoInicial?: string | null;
  valorAquisicao?: number | null;
};

@Injectable()
export class EquipamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private gerarCodigoQr(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async create(dto: CreateEquipamentoDto) {
    const codigoQr = this.gerarCodigoQr();
    return this.prisma.equipamento.create({
      data: {
        ambienteId: dto.ambienteId,
        codigoQr,
        nome: dto.nome,
        marca: dto.marca,
        modelo: dto.modelo,
        numeroSerie: dto.numeroSerie,
        tipoEquipamento: dto.tipoEquipamento,
        potencia: dto.potencia,
        dataInstalacao: dto.dataInstalacao ? new Date(dto.dataInstalacao) : null,
        condicao: dto.condicao,
        diagnosticoInicial: dto.diagnosticoInicial,
        valorAquisicao: dto.valorAquisicao,
      },
    });
  }

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.equipamento.findMany({
        where,
        include: { ambiente: { include: { cliente: true } } },
        orderBy: { nome: 'asc' },
        skip,
        take: perPage,
      }),
      this.prisma.equipamento.count({ where }),
    ]);
    return { data, total, page, perPage };
  }

  async findOne(id: string) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
      include: { ambiente: { include: { cliente: true } } },
    });
    if (!equipamento) throw new NotFoundException('Equipamento não encontrado');
    return equipamento;
  }

  async findHistorico(id: string) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
      include: { ambiente: { include: { cliente: true } } },
    });
    if (!equipamento) throw new NotFoundException('Equipamento não encontrado');

    const itens = await this.prisma.ordemServicoItem.findMany({
      where: { equipamentoId: id },
      include: {
        ordemServico: {
          select: {
            id: true,
            tipo: true,
            status: true,
            origem: true,
            dataAgendamento: true,
            dataConclusao: true,
            valorMaoObra: true,
            valorPecas: true,
            observacoesGerais: true,
          },
        },
      },
      orderBy: { ordemServico: { dataAgendamento: 'desc' } },
    });

    const seisAtras = new Date();
    seisAtras.setMonth(seisAtras.getMonth() - 6);
    const corretivasRecentes = itens.filter(
      (i) =>
        i.ordemServico.tipo === 'corretiva' &&
        new Date(i.ordemServico.dataAgendamento) >= seisAtras,
    ).length;
    const isReincidente = corretivasRecentes >= 3;

    return { equipamento, itens, isReincidente, corretivasRecentes };
  }

  async findByQr(codigoQr: string) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: { codigoQr, deletedAt: null },
      include: { ambiente: { include: { cliente: true } } },
    });
    if (!equipamento) throw new NotFoundException('QR Code não encontrado');
    return equipamento;
  }

  async update(id: string, data: UpdateEquipamentoData) {
    await this.findOne(id);
    const { dataInstalacao, ...rest } = data;
    return this.prisma.equipamento.update({
      where: { id },
      data: {
        ...rest,
        ...(dataInstalacao !== undefined
          ? { dataInstalacao: dataInstalacao ? new Date(dataInstalacao) : null }
          : {}),
      },
    });
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
    return this.prisma.equipamento.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMetricasConfiabilidade(periodo = 365, clienteId?: string) {
    const desde = new Date();
    desde.setDate(desde.getDate() - periodo);

    const equipWhere: any = { deletedAt: null };
    if (clienteId) equipWhere.ambiente = { cliente: { id: clienteId } };

    const [equipamentos, itens] = await Promise.all([
      this.prisma.equipamento.findMany({
        where: equipWhere,
        include: { ambiente: { include: { cliente: true } } },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.ordemServicoItem.findMany({
        where: {
          ordemServico: {
            tipo: 'corretiva',
            status: 'concluida',
            dataConclusao: { gte: desde },
          },
        },
        select: {
          equipamentoId: true,
          ordemServico: {
            select: { dataAgendamento: true, dataConclusao: true },
          },
        },
        orderBy: { ordemServico: { dataConclusao: 'asc' } },
      }),
    ]);

    const itensPorEquip = new Map<string, typeof itens>();
    for (const item of itens) {
      if (!itensPorEquip.has(item.equipamentoId)) {
        itensPorEquip.set(item.equipamentoId, []);
      }
      itensPorEquip.get(item.equipamentoId)!.push(item);
    }

    return equipamentos.map((eq) => {
      const equItems = itensPorEquip.get(eq.id) ?? [];

      const mttrHoras =
        equItems.length > 0
          ? +(
              equItems.reduce((sum, i) => {
                const diff =
                  (i.ordemServico.dataConclusao!.getTime() -
                    i.ordemServico.dataAgendamento.getTime()) /
                  3_600_000;
                return sum + diff;
              }, 0) / equItems.length
            ).toFixed(1)
          : null;

      let mtbfDias: number | null = null;
      if (equItems.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < equItems.length; i++) {
          const diff =
            (equItems[i].ordemServico.dataConclusao!.getTime() -
              equItems[i - 1].ordemServico.dataConclusao!.getTime()) /
            86_400_000;
          intervals.push(diff);
        }
        mtbfDias = +(intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
      }

      return {
        id: eq.id,
        nome: eq.nome,
        marca: eq.marca,
        tipoEquipamento: eq.tipoEquipamento,
        cliente:
          eq.ambiente?.cliente?.nomeFantasia ??
          eq.ambiente?.cliente?.razaoSocial ??
          null,
        ambiente: eq.ambiente?.nome ?? null,
        totalCorretivas: equItems.length,
        ultimaCorretiva:
          equItems.length > 0
            ? equItems[equItems.length - 1].ordemServico.dataConclusao
            : null,
        mttrHoras,
        mtbfDias,
      };
    });
  }
}
