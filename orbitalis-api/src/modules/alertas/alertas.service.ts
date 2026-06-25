import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertaTipo, AlertaSeveridade } from '@prisma/client';

@Injectable()
export class AlertasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(resolvido?: boolean) {
    return this.prisma.alertaOcorrencia.findMany({
      where: resolvido !== undefined ? { resolvido } : undefined,
      orderBy: [{ resolvido: 'asc' }, { criadoEm: 'desc' }],
    });
  }

  async resolver(id: string) {
    return this.prisma.alertaOcorrencia.update({
      where: { id },
      data: { resolvido: true, resolvidoEm: new Date() },
    });
  }

  async resolverTodos() {
    const agora = new Date();
    const { count } = await this.prisma.alertaOcorrencia.updateMany({
      where: { resolvido: false },
      data: { resolvido: true, resolvidoEm: agora },
    });
    return { resolvidos: count };
  }

  async getConfig() {
    let cfg = await this.prisma.alertaConfig.findFirst();
    if (!cfg) {
      cfg = await this.prisma.alertaConfig.create({ data: {} });
    }
    return cfg;
  }

  async updateConfig(data: {
    osSemAtualizacaoDias?: number;
    equipamentoCorretivasMes?: number;
    contratoVencendoDias?: number;
    planoVencendoDias?: number;
  }) {
    let cfg = await this.prisma.alertaConfig.findFirst();
    if (!cfg) {
      cfg = await this.prisma.alertaConfig.create({ data: {} });
    }
    return this.prisma.alertaConfig.update({ where: { id: cfg.id }, data });
  }

  async avaliarRegras() {
    const agora = new Date();
    const cfg = await this.getConfig();
    let criados = 0;

    // ── Regra 1: O.S. atrasadas ──────────────────────────────────────────────
    const atrasadas = await this.prisma.ordemServico.findMany({
      where: {
        status: { in: ['agendada', 'em_andamento'] },
        dataAgendamento: { lt: agora },
      },
      include: { ambiente: { include: { cliente: true } } },
    });

    for (const os of atrasadas) {
      const existente = await this.prisma.alertaOcorrencia.findFirst({
        where: { tipo: AlertaTipo.os_atrasada, referenciaId: os.id, resolvido: false },
      });
      if (!existente) {
        const dias = Math.floor((agora.getTime() - os.dataAgendamento.getTime()) / 86_400_000);
        const num = os.numero != null ? `OS-${String(os.numero).padStart(4, '0')}` : `OS-${os.id.slice(0, 6).toUpperCase()}`;
        await this.prisma.alertaOcorrencia.create({
          data: {
            tipo: AlertaTipo.os_atrasada,
            severidade: dias >= 5 ? AlertaSeveridade.critico : AlertaSeveridade.aviso,
            titulo: `${num} está atrasada`,
            descricao: `A O.S. ${num} (${os.ambiente.cliente.razaoSocial}) está ${dias} dia(s) sem conclusão.`,
            referenciaId: os.id,
          },
        });
        criados++;
      }
    }

    // ── Regra 2: O.S. sem atualização por N dias ─────────────────────────────
    const limiarSemAtualiz = new Date(agora);
    limiarSemAtualiz.setDate(limiarSemAtualiz.getDate() - cfg.osSemAtualizacaoDias);

    const semAtualizacao = await this.prisma.ordemServico.findMany({
      where: {
        status: 'em_andamento',
        dataInicio: { lt: limiarSemAtualiz },
      },
      include: { ambiente: { include: { cliente: true } } },
    });

    for (const os of semAtualizacao) {
      const existente = await this.prisma.alertaOcorrencia.findFirst({
        where: { tipo: AlertaTipo.os_sem_atualizacao, referenciaId: os.id, resolvido: false },
      });
      if (!existente) {
        const num = os.numero != null ? `OS-${String(os.numero).padStart(4, '0')}` : `OS-${os.id.slice(0, 6).toUpperCase()}`;
        await this.prisma.alertaOcorrencia.create({
          data: {
            tipo: AlertaTipo.os_sem_atualizacao,
            severidade: AlertaSeveridade.aviso,
            titulo: `${num} sem atualização há ${cfg.osSemAtualizacaoDias}+ dias`,
            descricao: `A O.S. ${num} (${os.ambiente.cliente.razaoSocial}) está em andamento há mais de ${cfg.osSemAtualizacaoDias} dias sem atualização.`,
            referenciaId: os.id,
          },
        });
        criados++;
      }
    }

    // ── Regra 3: Contratos vencendo ──────────────────────────────────────────
    const limiarContrato = new Date(agora);
    limiarContrato.setDate(limiarContrato.getDate() + cfg.contratoVencendoDias);

    const contratosVencendo = await this.prisma.contrato.findMany({
      where: {
        ativo: true,
        vigenciaFim: { gte: agora, lte: limiarContrato },
      },
      include: { cliente: { select: { razaoSocial: true } } },
    });

    for (const c of contratosVencendo) {
      const existente = await this.prisma.alertaOcorrencia.findFirst({
        where: { tipo: AlertaTipo.contrato_vencendo, referenciaId: c.id, resolvido: false },
      });
      if (!existente) {
        const dias = Math.ceil((c.vigenciaFim.getTime() - agora.getTime()) / 86_400_000);
        await this.prisma.alertaOcorrencia.create({
          data: {
            tipo: AlertaTipo.contrato_vencendo,
            severidade: dias <= 7 ? AlertaSeveridade.critico : AlertaSeveridade.aviso,
            titulo: `Contrato de ${c.cliente.razaoSocial} vence em ${dias} dias`,
            descricao: `"${c.descricao}" vence em ${c.vigenciaFim.toLocaleDateString('pt-BR')}. Renove para evitar interrupção.`,
            referenciaId: c.id,
          },
        });
        criados++;
      }
    }

    // ── Regra 4: Equipamentos reincidentes ───────────────────────────────────
    const ha6Meses = new Date(agora);
    ha6Meses.setMonth(ha6Meses.getMonth() - 6);

    const equipReincidentes = await this.prisma.ordemServicoItem.groupBy({
      by: ['equipamentoId'],
      where: {
        ordemServico: {
          tipo: 'corretiva',
          status: 'concluida',
          dataConclusao: { gte: ha6Meses },
        },
      },
      _count: { equipamentoId: true },
      having: { equipamentoId: { _count: { gte: cfg.equipamentoCorretivasMes } } },
    });

    for (const eq of equipReincidentes) {
      const existente = await this.prisma.alertaOcorrencia.findFirst({
        where: { tipo: AlertaTipo.equipamento_reincidente, referenciaId: eq.equipamentoId, resolvido: false },
      });
      if (!existente) {
        const equipamento = await this.prisma.equipamento.findUnique({
          where: { id: eq.equipamentoId },
          include: { ambiente: { include: { cliente: true } } },
        });
        if (equipamento) {
          await this.prisma.alertaOcorrencia.create({
            data: {
              tipo: AlertaTipo.equipamento_reincidente,
              severidade: AlertaSeveridade.aviso,
              titulo: `Equipamento reincidente: ${equipamento.nome}`,
              descricao: `${equipamento.nome} (${equipamento.ambiente.cliente.razaoSocial}) teve ${eq._count.equipamentoId} O.S. corretivas nos últimos 6 meses.`,
              referenciaId: eq.equipamentoId,
            },
          });
          criados++;
        }
      }
    }

    return criados;
  }

  async contarAtivos() {
    return this.prisma.alertaOcorrencia.count({ where: { resolvido: false } });
  }
}
