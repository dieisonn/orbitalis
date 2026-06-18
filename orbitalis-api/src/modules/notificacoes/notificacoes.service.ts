import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP não configurado — notificações desativadas');
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME ?? 'Orbitalis'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`E-mail enviado → ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}:`, err);
    }
  }

  async notificarOsAgendada(params: {
    tecnicoEmail: string
    tecnicoNome: string | null
    osNumero: string
    clienteNome: string
    ambienteNome: string
    dataAgendamento: string
  }) {
    const { tecnicoEmail, tecnicoNome, osNumero, clienteNome, ambienteNome, dataAgendamento } = params;
    const data = new Date(dataAgendamento).toLocaleDateString('pt-BR');
    await this.send(
      tecnicoEmail,
      `[Orbitalis] Nova O.S. Agendada — ${osNumero}`,
      `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <div style="background:#0505ad;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px">Nova Ordem de Serviço</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">${osNumero}</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0">
          <p style="font-size:14px;color:#374151">Olá, <strong>${tecnicoNome ?? tecnicoEmail}</strong>!</p>
          <p style="font-size:14px;color:#374151">Uma nova O.S. foi agendada para você:</p>
          <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#9ca3af;width:120px">Cliente</td><td><strong>${clienteNome}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Ambiente</td><td>${ambienteNome}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Data</td><td><strong>${data}</strong></td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Acesse o Orbitalis para mais detalhes.</p>
        </div>
      </div>
      `,
    );
  }

  async notificarOsConcluida(params: {
    clienteEmail: string
    clienteNome: string
    osNumero: string
    ambienteNome: string
    tecnicoNome: string | null
    dataConclusao: string
  }) {
    const { clienteEmail, clienteNome, osNumero, ambienteNome, tecnicoNome, dataConclusao } = params;
    const data = new Date(dataConclusao).toLocaleDateString('pt-BR');
    await this.send(
      clienteEmail,
      `[Orbitalis] Manutenção Concluída — ${osNumero}`,
      `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <div style="background:#16a34a;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px">Manutenção Concluída ✓</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">${osNumero}</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0">
          <p style="font-size:14px;color:#374151">Olá, <strong>${clienteNome}</strong>!</p>
          <p style="font-size:14px;color:#374151">A manutenção no seu local foi concluída com sucesso.</p>
          <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#9ca3af;width:120px">Ambiente</td><td>${ambienteNome}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Técnico</td><td>${tecnicoNome ?? '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Concluído em</td><td><strong>${data}</strong></td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Em caso de dúvidas, entre em contato com nossa equipe.</p>
        </div>
      </div>
      `,
    );
  }

  async notificarOsProxima(params: {
    clienteEmail: string
    clienteNome: string
    osNumero: string
    ambienteNome: string
    tecnicoNome: string | null
    dataAgendamento: string
  }) {
    const { clienteEmail, clienteNome, osNumero, ambienteNome, tecnicoNome, dataAgendamento } = params;
    const data = new Date(dataAgendamento).toLocaleDateString('pt-BR');
    await this.send(
      clienteEmail,
      `[Orbitalis] Manutenção Agendada para Amanhã — ${osNumero}`,
      `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <div style="background:#0505ad;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px">Lembrete de Manutenção</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">${osNumero}</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0">
          <p style="font-size:14px;color:#374151">Olá, <strong>${clienteNome}</strong>!</p>
          <p style="font-size:14px;color:#374151">Lembramos que há uma manutenção agendada para <strong>amanhã</strong> no seu local.</p>
          <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#9ca3af;width:140px">Ambiente</td><td><strong>${ambienteNome}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Técnico</td><td>${tecnicoNome ?? 'A confirmar'}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Data</td><td><strong>${data}</strong></td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Por favor, certifique-se de que o acesso ao local estará disponível. Em caso de dúvidas, entre em contato com nossa equipe.</p>
        </div>
      </div>
      `,
    );
  }

  async notificarContratoVencendo(params: {
    clienteEmail: string
    clienteNome: string
    contratoDescricao: string
    diasRestantes: number
    dataFim: string
  }) {
    const { clienteEmail, clienteNome, contratoDescricao, diasRestantes, dataFim } = params;
    const data = new Date(dataFim).toLocaleDateString('pt-BR');
    const urgente = diasRestantes <= 7;
    await this.send(
      clienteEmail,
      `[Orbitalis] ${urgente ? '⚠️ ' : ''}Contrato vencendo em ${diasRestantes} dia(s)`,
      `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <div style="background:${urgente ? '#b91c1c' : '#d97706'};padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px">${urgente ? '⚠️ ' : ''}Contrato Próximo do Vencimento</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">Vence em ${diasRestantes} dia(s)</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0">
          <p style="font-size:14px;color:#374151">Olá, <strong>${clienteNome}</strong>!</p>
          <p style="font-size:14px;color:#374151">O seu contrato de manutenção está próximo do vencimento. Entre em contato para garantir a continuidade dos serviços.</p>
          <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#9ca3af;width:140px">Contrato</td><td><strong>${contratoDescricao}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Vencimento</td><td style="color:${urgente ? '#b91c1c' : '#d97706'};font-weight:bold">${data}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Dias restantes</td><td style="color:${urgente ? '#b91c1c' : '#d97706'};font-weight:bold">${diasRestantes} dia(s)</td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Entre em contato com nossa equipe para renovar ou discutir as condições do contrato.</p>
        </div>
      </div>
      `,
    );
  }

  async notificarOsAtrasada(params: {
    adminEmail: string
    osNumero: string
    clienteNome: string
    ambienteNome: string
    tecnicoNome: string | null
    diasAtraso: number
  }) {
    const { adminEmail, osNumero, clienteNome, ambienteNome, tecnicoNome, diasAtraso } = params;
    await this.send(
      adminEmail,
      `[Orbitalis] ⚠️ O.S. Atrasada — ${osNumero}`,
      `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <div style="background:#dc2626;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px">⚠️ O.S. com Atraso</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">${osNumero} — ${diasAtraso} dia(s) de atraso</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0">
          <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:8px 0">
            <tr><td style="padding:6px 0;color:#9ca3af;width:120px">Cliente</td><td><strong>${clienteNome}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Ambiente</td><td>${ambienteNome}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Técnico</td><td>${tecnicoNome ?? 'Não atribuído'}</td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af">Atraso</td><td style="color:#dc2626;font-weight:bold">${diasAtraso} dia(s)</td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Acesse o Orbitalis para tomar uma ação.</p>
        </div>
      </div>
      `,
    );
  }
}
