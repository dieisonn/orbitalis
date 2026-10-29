import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
import { CreatePlanoManutencaoDto } from './dto/create-plano.dto';

type EquipConfigInput = { equipamentoId: string; modeloChecklistId?: string | null };

const INCLUDE_FULL = {
  cliente: {
    select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true, endereco: true, telefone: true },
  },
  tecnico: { select: { id: true, email: true, nome: true, crea: true } },
  tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true } },
  contrato: { select: { id: true, descricao: true, vigenciaInicio: true, vigenciaFim: true } },
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

  // Todos os equipamentos do plano precisam estar em ambientes do cliente do plano
  private async validarEquipamentosDoCliente(clienteId: string, equipamentoIds: string[]) {
    if (equipamentoIds.length === 0) return;
    const ids = [...new Set(equipamentoIds)];
    const validos = await this.prisma.equipamento.count({
      where: { id: { in: ids }, deletedAt: null, ambiente: { clienteId, deletedAt: null } },
    });
    if (validos !== ids.length) {
      throw new BadRequestException('Há equipamentos que não pertencem a este cliente');
    }
  }

  // O contrato do plano precisa ser do mesmo cliente do plano
  private async validarContratoDoCliente(clienteId: string, contratoId?: string | null) {
    if (!contratoId) return;
    const ok = await this.prisma.contrato.count({ where: { id: contratoId, clienteId } });
    if (!ok) throw new BadRequestException('O contrato informado não pertence a este cliente');
  }

  async create(dto: CreatePlanoManutencaoDto) {
    await this.validarContratoDoCliente(dto.clienteId, dto.contratoId);
    await this.validarEquipamentosDoCliente(
      dto.clienteId,
      (dto.equipamentosConfig ?? []).map((c) => c.equipamentoId),
    );
    return this.prisma.$transaction(async (tx) => {
      const plano = await tx.planoManutencao.create({
        data: {
          clienteId: dto.clienteId,
          tecnicoId: dto.tecnicoId,
          tipoServicoId: dto.tipoServicoId || null,
          contratoId: dto.contratoId || null,
          frequenciaDias: dto.frequenciaDias,
          visitasPrevistas: dto.visitasPrevistas,
          agrupamento: dto.agrupamento || null,
          maxEquipamentosPorOs: dto.maxEquipamentosPorOs ?? null,
          horaInicio: dto.horaInicio || null,
          horaFim: dto.horaFim || null,
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
          tipoServico: { select: { sigla: true, corHex: true } },
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
        itens: { select: { equipamentoId: true } },
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
      tipoServicoId?: string | null;
      frequenciaDias?: number;
      visitasPrevistas?: number;
      agrupamento?: string | null;
      maxEquipamentosPorOs?: number | null;
      horaInicio?: string | null;
      horaFim?: string | null;
      proximaGeracao?: string;
      dataFim?: string | null;
      ativo?: boolean;
      equipamentosConfig?: EquipConfigInput[];
    },
  ) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const { proximaGeracao, dataFim, equipamentosConfig, ...rest } = data;

    if (rest.visitasPrevistas !== undefined) {
      const v = Number(rest.visitasPrevistas);
      if (!Number.isInteger(v) || v < 1 || v > 120) {
        throw new BadRequestException('Informe de 1 a 120 visitas por equipamento incluídas no plano');
      }
      rest.visitasPrevistas = v;
    }

    if (rest.agrupamento !== undefined) {
      rest.agrupamento = rest.agrupamento || null;
      if (rest.agrupamento && !['cliente', 'ambiente'].includes(rest.agrupamento)) {
        throw new BadRequestException("Agrupamento deve ser 'cliente' ou 'ambiente'");
      }
    }
    if (rest.maxEquipamentosPorOs !== undefined) {
      const m = rest.maxEquipamentosPorOs == null || (rest.maxEquipamentosPorOs as unknown) === '' ? null : Number(rest.maxEquipamentosPorOs);
      if (m !== null && (!Number.isInteger(m) || m < 1 || m > 500)) {
        throw new BadRequestException('Máximo de equipamentos por O.S. deve ser de 1 a 500');
      }
      rest.maxEquipamentosPorOs = m;
    }
    for (const k of ['horaInicio', 'horaFim'] as const) {
      if (rest[k] !== undefined) {
        rest[k] = rest[k] || null;
        if (rest[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(rest[k] as string)) throw new BadRequestException('Horário deve estar no formato HH:MM');
      }
    }

    const contratoPatch = (rest as { contratoId?: string | null }).contratoId;
    if (contratoPatch) {
      await this.validarContratoDoCliente((rest as { clienteId?: string }).clienteId ?? plano.clienteId, contratoPatch);
    }

    if (equipamentosConfig !== undefined) {
      await this.validarEquipamentosDoCliente(
        (rest as { clienteId?: string }).clienteId ?? plano.clienteId,
        equipamentosConfig.map((c) => c.equipamentoId),
      );
    }

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

  gerarOsPlano(id: string) {
    return this.cronService.gerarOsPlano(id);
  }
}
