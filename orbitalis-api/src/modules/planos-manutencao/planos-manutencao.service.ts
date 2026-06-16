import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
import { CreatePlanoManutencaoDto } from './dto/create-plano.dto';

type EquipConfigInput = { equipamentoId: string; modeloChecklistId?: string | null };

const INCLUDE_FULL = {
  cliente: {
    select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true, endereco: true, telefone: true },
  },
  tecnico: { select: { id: true, email: true, nome: true } },
  equipamentosConfig: {
    include: {
      equipamento: {
        include: {
          ambiente: {
            select: { id: true, nome: true, localizacaoInterna: true, metrosQuadrados: true, capacidadeTermica: true },
          },
        },
      },
      modeloChecklist: { select: { id: true, nome: true, itens: true } },
    },
    orderBy: { equipamento: { nome: 'asc' } },
  },
} as const;

@Injectable()
export class PlanosManutencaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
  ) {}

  async create(dto: CreatePlanoManutencaoDto) {
    return this.prisma.$transaction(async (tx) => {
      const plano = await tx.planoManutencao.create({
        data: {
          clienteId: dto.clienteId,
          tecnicoId: dto.tecnicoId,
          frequenciaDias: dto.frequenciaDias,
          proximaGeracao: new Date(dto.proximaGeracao),
          dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
          ativo: dto.ativo ?? true,
        },
      });

      if (dto.equipamentosConfig?.length > 0) {
        await tx.planoEquipamentoConfig.createMany({
          data: dto.equipamentosConfig.map((c) => ({
            planoId: plano.id,
            equipamentoId: c.equipamentoId,
            modeloChecklistId: c.modeloChecklistId || null,
          })),
        });
      }

      return tx.planoManutencao.findUnique({ where: { id: plano.id }, include: INCLUDE_FULL });
    });
  }

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.planoManutencao.findMany({
        include: {
          cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          tecnico: { select: { email: true, nome: true } },
          _count: { select: { equipamentosConfig: true } },
        },
        orderBy: [{ cliente: { razaoSocial: 'asc' } }, { proximaGeracao: 'asc' }],
        skip,
        take: perPage,
      }),
      this.prisma.planoManutencao.count(),
    ]);
    return { data, total, page, perPage };
  }

  async findOne(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const ordensServico = await this.prisma.ordemServico.findMany({
      where: { planoId: id },
      orderBy: { dataAgendamento: 'asc' },
      take: 200,
      select: {
        id: true,
        status: true,
        origem: true,
        dataAgendamento: true,
        dataConclusao: true,
        ambienteId: true,
      },
    });

    return { ...plano, ordensServico };
  }

  async toggleAtivo(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    return this.prisma.planoManutencao.update({
      where: { id },
      data: { ativo: !plano.ativo },
    });
  }

  async update(
    id: string,
    data: {
      tecnicoId?: string | null;
      frequenciaDias?: number;
      proximaGeracao?: string;
      dataFim?: string | null;
      ativo?: boolean;
      equipamentosConfig?: EquipConfigInput[];
    },
  ) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const { proximaGeracao, dataFim, equipamentosConfig, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.planoManutencao.update({
        where: { id },
        data: {
          ...rest,
          ...(proximaGeracao ? { proximaGeracao: new Date(proximaGeracao) } : {}),
          ...(dataFim !== undefined ? { dataFim: dataFim ? new Date(dataFim) : null } : {}),
        },
      });

      if (equipamentosConfig !== undefined) {
        await tx.planoEquipamentoConfig.deleteMany({ where: { planoId: id } });
        if (equipamentosConfig.length > 0) {
          await tx.planoEquipamentoConfig.createMany({
            data: equipamentosConfig.map((c) => ({
              planoId: id,
              equipamentoId: c.equipamentoId,
              modeloChecklistId: c.modeloChecklistId || null,
            })),
          });
        }
      }

      return tx.planoManutencao.findUnique({ where: { id }, include: INCLUDE_FULL });
    });
  }

  async remove(id: string, deleteOs = false) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    if (deleteOs) {
      await this.prisma.ordemServico.deleteMany({
        where: {
          planoId: id,
          status: { notIn: ['concluida', 'cancelada'] },
        },
      });
    }

    return this.prisma.planoManutencao.delete({ where: { id } });
  }

  dispararAgora() {
    return this.cronService.gerarOsPreventivas();
  }

  async gerarOsPlano(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({
      where: { id },
      include: {
        equipamentosConfig: {
          include: {
            equipamento: { select: { id: true, ambienteId: true } },
            modeloChecklist: true,
          },
        },
      },
    });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const configs = plano.equipamentosConfig.map((c) => ({
      equipamentoId: c.equipamentoId,
      ambienteId: c.equipamento.ambienteId,
      snapshot: c.modeloChecklist
        ? (JSON.parse(JSON.stringify(c.modeloChecklist.itens)) as Prisma.InputJsonValue)
        : ([] as Prisma.InputJsonValue),
    }));

    const datasParaGerar: Date[] = [];
    let cursor = new Date(plano.proximaGeracao);

    if (plano.dataFim) {
      while (true) {
        const next = new Date(cursor);
        next.setDate(next.getDate() + plano.frequenciaDias);
        if (next > plano.dataFim) break;
        datasParaGerar.push(new Date(cursor));
        cursor = next;
      }
    } else {
      datasParaGerar.push(new Date(cursor));
    }

    if (datasParaGerar.length === 0) {
      return { geradas: 0, mensagem: 'Nenhuma data restante para gerar.' };
    }

    let totalGeradas = 0;

    for (const dataGeracao of datasParaGerar) {
      for (const config of configs) {
        await this.prisma.$transaction(async (tx) => {
          const os = await tx.ordemServico.create({
            data: {
              ambienteId: config.ambienteId,
              planoId: plano.id,
              tecnicoId: plano.tecnicoId,
              status: 'agendada',
              tipo: 'preventiva',
              origem: 'preventiva_automatica',
              dataAgendamento: dataGeracao,
            },
          });

          await tx.ordemServicoItem.create({
            data: {
              ordemServicoId: os.id,
              equipamentoId: config.equipamentoId,
              statusItem: 'pendente',
              checklistSnapshot: config.snapshot,
            },
          });
        });
        totalGeradas++;
      }
    }

    const ultimaData = datasParaGerar[datasParaGerar.length - 1];
    const proxima = new Date(ultimaData);
    proxima.setDate(proxima.getDate() + plano.frequenciaDias);
    const esgotado = plano.dataFim ? proxima > plano.dataFim : false;

    await this.prisma.planoManutencao.update({
      where: { id },
      data: {
        ultimaGeracao: ultimaData,
        proximaGeracao: proxima,
        ...(esgotado ? { ativo: false } : {}),
      },
    });

    return { geradas: totalGeradas, esgotado };
  }
}
