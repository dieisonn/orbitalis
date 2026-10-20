import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { AlertasService } from '../alertas/alertas.service';
import { AgendaService } from '../agenda/agenda.service';
import { gerarOsDoPlano, INCLUDE_GERACAO } from './geracao-preventiva';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly alertas: AlertasService,
    private readonly agenda: AgendaService,
  ) {}

  // Executa diariamente às 00:00:01 (§US05)
  @Cron('1 0 0 * * *')
  async gerarOsPreventivas() {
    this.logger.log('Cron preventivo iniciado');

    const agora = new Date();

    const planos = await this.prisma.planoManutencao.findMany({
      where: {
        ativo: true,
        proximaGeracao: { lte: agora },
        OR: [{ dataFim: null }, { dataFim: { gte: agora } }],
      },
      include: INCLUDE_GERACAO,
    });

    this.logger.log(`${planos.length} plano(s) elegível(is) encontrado(s)`);

    let geradas = 0;
    for (const plano of planos) {
      try {
        const r = await gerarOsDoPlano(this.prisma, this.agenda, this.logger, plano);
        geradas += r.geradas;
      } catch (err) {
        this.logger.error(`Falha ao gerar O.S. para plano ${plano.id}:`, err);
      }
    }

    this.logger.log(`Cron finalizado — ${geradas} O.S. gerada(s) no total`);
    return geradas;
  }

  // Gera as O.S. restantes de UM plano (botão "Gerar O.S." do plano)
  async gerarOsPlano(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id }, include: INCLUDE_GERACAO });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    const r = await gerarOsDoPlano(this.prisma, this.agenda, this.logger, plano);
    if (r.semCiclos) return { geradas: 0, mensagem: 'Nenhuma data restante para gerar.' };
    return { geradas: r.geradas, esgotado: r.esgotado };
  }

  // Executa diariamente às 08:00 — notifica admins sobre O.S. atrasadas
  @Cron('0 0 8 * * *')
  async notificarOsAtrasadas() {
    const agora = new Date();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const atrasadas = await this.prisma.ordemServico.findMany({
      where: {
        status: { in: ['agendada', 'em_andamento'] },
        dataAgendamento: { lt: agora },
      },
      include: {
        ambiente: { include: { cliente: true } },
        tecnico: { select: { nome: true } },
      },
    });

    for (const os of atrasadas) {
      const diasAtraso = Math.floor((agora.getTime() - os.dataAgendamento.getTime()) / 86_400_000);
      const osNumero = os.numero != null ? `OS-${String(os.numero).padStart(4, '0')}` : `OS-${os.id.slice(0, 6).toUpperCase()}`;
      await this.notificacoes.notificarOsAtrasada({
        adminEmail,
        osNumero,
        clienteNome: os.ambiente.cliente.razaoSocial,
        ambienteNome: os.ambiente.nome,
        tecnicoNome: os.tecnico?.nome ?? null,
        diasAtraso,
      }).catch(() => null);
    }

    if (atrasadas.length > 0) {
      this.logger.log(`Notificações de atraso enviadas: ${atrasadas.length} O.S.`);
    }
  }

  // Executa diariamente às 07:00 — avalia regras de alerta
  @Cron('0 0 7 * * *')
  async avaliarAlertas() {
    const criados = await this.alertas.avaliarRegras();
    if (criados > 0) this.logger.log(`Alertas criados: ${criados}`);
  }

  // Executa diariamente às 08:30 — notifica clientes sobre O.S. agendadas para amanhã
  @Cron('0 30 8 * * *')
  async notificarOsProximas() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const inicioDia = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 0, 0, 0);
    const fimDia    = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 23, 59, 59, 999);

    const osAmanha = await this.prisma.ordemServico.findMany({
      where: {
        status: { in: ['agendada', 'aberta'] },
        dataAgendamento: { gte: inicioDia, lte: fimDia },
      },
      include: {
        ambiente: {
          include: {
            cliente: { select: { razaoSocial: true, telefone: true, usuario: { select: { email: true } } } },
          },
        },
        tecnico: { select: { nome: true } },
      },
    });

    let enviadas = 0;
    for (const os of osAmanha) {
      const clienteEmail = os.ambiente.cliente.usuario?.email;
      if (!clienteEmail) continue;
      const osNumero = os.numero != null
        ? `OS-${String(os.numero).padStart(4, '0')}`
        : `OS-${os.id.slice(0, 6).toUpperCase()}`;
      await this.notificacoes.notificarOsProxima({
        clienteEmail,
        clienteNome: os.ambiente.cliente.razaoSocial,
        clienteTelefone: os.ambiente.cliente.telefone,
        osNumero,
        ambienteNome: os.ambiente.nome,
        tecnicoNome: os.tecnico?.nome ?? null,
        dataAgendamento: os.dataAgendamento.toISOString(),
      }).catch(() => null);
      enviadas++;
    }
    if (enviadas > 0) this.logger.log(`Lembretes de O.S. enviados aos clientes: ${enviadas}`);
  }

  // Executa diariamente às 08:45 — notifica clientes sobre contratos vencendo
  @Cron('0 45 8 * * *')
  async notificarContratosVencendo() {
    const agora = new Date();
    const em30Dias = new Date(agora);
    em30Dias.setDate(em30Dias.getDate() + 30);

    const contratos = await this.prisma.contrato.findMany({
      where: {
        ativo: true,
        vigenciaFim: { gte: agora, lte: em30Dias },
      },
      include: {
        cliente: { select: { razaoSocial: true, telefone: true, usuario: { select: { email: true } } } },
      },
    });

    let enviadas = 0;
    for (const contrato of contratos) {
      const clienteEmail = contrato.cliente.usuario?.email;
      if (!clienteEmail) continue;

      const diasRestantes = Math.ceil(
        (contrato.vigenciaFim.getTime() - agora.getTime()) / 86_400_000,
      );
      if (![30, 14, 7, 3, 1].includes(diasRestantes)) continue;

      await this.notificacoes.notificarContratoVencendo({
        clienteEmail,
        clienteNome: contrato.cliente.razaoSocial,
        clienteTelefone: contrato.cliente.telefone,
        contratoDescricao: contrato.descricao,
        diasRestantes,
        dataFim: contrato.vigenciaFim.toISOString(),
      }).catch(() => null);
      enviadas++;
    }
    if (enviadas > 0) this.logger.log(`Alertas de contrato vencendo enviados: ${enviadas}`);
  }
}
