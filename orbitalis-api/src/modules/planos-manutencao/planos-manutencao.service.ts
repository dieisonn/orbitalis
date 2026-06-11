import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
import { CreatePlanoManutencaoDto } from './dto/create-plano.dto';

@Injectable()
export class PlanosManutencaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
  ) {}

  create(dto: CreatePlanoManutencaoDto) {
    return this.prisma.planoManutencao.create({
      data: {
        ambienteId: dto.ambienteId,
        tecnicoId: dto.tecnicoId,
        modeloChecklistId: dto.modeloChecklistId,
        frequenciaDias: dto.frequenciaDias,
        proximaGeracao: new Date(dto.proximaGeracao),
        dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
        ativo: dto.ativo ?? true,
      },
      include: { ambiente: true, tecnico: { select: { email: true } } },
    });
  }

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.planoManutencao.findMany({
        include: { ambiente: true, tecnico: { select: { email: true } } },
        orderBy: { proximaGeracao: 'asc' },
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
      include: {
        ambiente: { include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } } },
        tecnico: { select: { id: true, email: true } },
        modeloChecklist: { select: { id: true, nome: true } },
      },
    });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const ordensServico = await this.prisma.ordemServico.findMany({
      where: { ambienteId: plano.ambienteId, origem: 'preventiva_automatica' },
      orderBy: { dataAgendamento: 'desc' },
      take: 50,
      select: { id: true, status: true, origem: true, dataAgendamento: true, dataConclusao: true },
    });

    return { ...plano, ordensServico };
  }

  async toggleAtivo(id: string) {
    const plano = await this.findOne(id);
    return this.prisma.planoManutencao.update({
      where: { id },
      data: { ativo: !plano.ativo },
    });
  }

  async update(
    id: string,
    data: {
      tecnicoId?: string | null;
      modeloChecklistId?: string | null;
      frequenciaDias?: number;
      proximaGeracao?: string;
      dataFim?: string | null;
      ativo?: boolean;
    },
  ) {
    await this.findOne(id);
    const { proximaGeracao, dataFim, ...rest } = data;
    return this.prisma.planoManutencao.update({
      where: { id },
      data: {
        ...rest,
        ...(proximaGeracao ? { proximaGeracao: new Date(proximaGeracao) } : {}),
        ...(dataFim !== undefined ? { dataFim: dataFim ? new Date(dataFim) : null } : {}),
      },
      include: {
        ambiente: true,
        tecnico: { select: { email: true } },
        modeloChecklist: { select: { id: true, nome: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.planoManutencao.delete({ where: { id } });
  }

  // Disparo manual do cron global (todos os planos elegíveis)
  dispararAgora() {
    return this.cronService.gerarOsPreventivas();
  }

  // Gera todas as O.S. restantes de UM plano específico (ignora filtro de data)
  async gerarOsPlano(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({
      where: { id },
      include: {
        ambiente: { include: { equipamentos: { where: { deletedAt: null } } } },
        modeloChecklist: true,
      },
    });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    // Monta lista de datas: de proximaGeracao até dataFim (ou só a próxima se sem dataFim)
    const datasParaGerar: Date[] = [];
    let cursor = new Date(plano.proximaGeracao);

    if (plano.dataFim) {
      while (cursor <= plano.dataFim) {
        datasParaGerar.push(new Date(cursor));
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + plano.frequenciaDias);
      }
    } else {
      datasParaGerar.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + plano.frequenciaDias);
    }

    if (datasParaGerar.length === 0) {
      return { geradas: 0, mensagem: 'Nenhuma data restante para gerar.' };
    }

    const snapshot = plano.modeloChecklist
      ? JSON.parse(JSON.stringify(plano.modeloChecklist.itens))
      : [];

    for (const dataGeracao of datasParaGerar) {
      await this.prisma.$transaction(async (tx) => {
        const os = await tx.ordemServico.create({
          data: {
            ambienteId: plano.ambienteId,
            tecnicoId: plano.tecnicoId,
            status: 'agendada',
            origem: 'preventiva_automatica',
            dataAgendamento: dataGeracao,
          },
        });

        if (plano.ambiente.equipamentos.length > 0) {
          await tx.ordemServicoItem.createMany({
            data: plano.ambiente.equipamentos.map((eq) => ({
              ordemServicoId: os.id,
              equipamentoId: eq.id,
              statusItem: 'pendente' as const,
              checklistSnapshot: snapshot,
            })),
          });
        }
      });
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

    return { geradas: datasParaGerar.length, esgotado };
  }
}
