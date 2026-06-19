import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';

export type CalendarEventPayload = {
  osNumero: string
  ambienteNome: string
  clienteNome: string
  clienteTelefone: string | null
  tecnicoNome: string | null
  tipo: string
  dataAgendamento: Date
  equipamentos: string[]
  observacoesGerais: string | null
  status: string
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  getAuthUrl(): string | null {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
    const client = this.createOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email'],
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<void> {
    const client = this.createOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const cal    = google.calendar({ version: 'v3', auth: client });

    const [userInfo, calList] = await Promise.all([
      oauth2.userinfo.get(),
      cal.calendarList.list({ minAccessRole: 'writer' }),
    ]);

    const primaryCal = calList.data.items?.find((c) => c.primary) ?? calList.data.items?.[0];

    await this.prisma.configuracaoEmpresa.updateMany({
      data: {
        googleConectado:    true,
        googleEmail:        userInfo.data.email ?? null,
        googleCalendarId:   primaryCal?.id ?? 'primary',
        googleAccessToken:  tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token ?? null,
        googleTokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    this.logger.log(`Google Calendar conectado: ${userInfo.data.email} — calendário: ${primaryCal?.summary}`);
  }

  async desconectar(): Promise<void> {
    await this.prisma.configuracaoEmpresa.updateMany({
      data: {
        googleConectado:    false,
        googleEmail:        null,
        googleCalendarId:   null,
        googleAccessToken:  null,
        googleRefreshToken: null,
        googleTokenExpiry:  null,
      },
    });
  }

  private async getClientAndCalendarId(): Promise<{ cal: calendar_v3.Calendar; calendarId: string } | null> {
    const config = await this.prisma.configuracaoEmpresa.findFirst();
    if (!config?.googleConectado || !config.googleRefreshToken) return null;

    const client = this.createOAuth2Client();
    client.setCredentials({
      access_token:  config.googleAccessToken ?? undefined,
      refresh_token: config.googleRefreshToken,
      expiry_date:   config.googleTokenExpiry?.getTime(),
    });

    // Persiste novo access_token quando o cliente fizer refresh automático
    client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.prisma.configuracaoEmpresa.updateMany({
          data: {
            googleAccessToken: tokens.access_token,
            googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          },
        }).catch(() => null);
      }
    });

    return {
      cal: google.calendar({ version: 'v3', auth: client }),
      calendarId: config.googleCalendarId ?? 'primary',
    };
  }

  private buildDescription(p: CalendarEventPayload): string {
    const tipoLabel = p.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva';
    return [
      p.osNumero,
      `Cliente: ${p.clienteNome}`,
      p.clienteTelefone ? `Telefone: ${p.clienteTelefone}` : null,
      p.tecnicoNome ? `Técnico: ${p.tecnicoNome}` : null,
      `Tipo: ${tipoLabel}`,
      '',
      p.equipamentos.length ? 'Equipamentos:' : null,
      ...p.equipamentos.map((e) => `- ${e}`),
      p.observacoesGerais ? `\nObs: ${p.observacoesGerais}` : null,
    ].filter((l) => l !== null).join('\n');
  }

  private colorId(status: string): string {
    const map: Record<string, string> = {
      aberta:       '7',  // peacock (azul)
      agendada:     '6',  // tangerine (laranja)
      em_andamento: '5',  // banana (amarelo)
      concluida:    '2',  // sage (verde)
      cancelada:    '8',  // graphite (cinza)
    };
    return map[status] ?? '7';
  }

  private dateInSaoPaulo(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
  }

  async criarEvento(payload: CalendarEventPayload): Promise<string | null> {
    const ctx = await this.getClientAndCalendarId();
    if (!ctx) return null;

    const dateStr = this.dateInSaoPaulo(new Date(payload.dataAgendamento));

    try {
      const res = await ctx.cal.events.insert({
        calendarId: ctx.calendarId,
        requestBody: {
          summary:     `${payload.ambienteNome} — ${payload.osNumero}`,
          description: this.buildDescription(payload),
          colorId:     this.colorId(payload.status),
          start: { dateTime: `${dateStr}T08:00:00`, timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: `${dateStr}T10:00:00`, timeZone: 'America/Sao_Paulo' },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
      });
      this.logger.log(`Evento criado: ${res.data.id}`);
      return res.data.id ?? null;
    } catch (err) {
      this.logger.error('Erro ao criar evento:', err);
      return null;
    }
  }

  async atualizarEvento(eventId: string, payload: CalendarEventPayload): Promise<void> {
    const ctx = await this.getClientAndCalendarId();
    if (!ctx) return;

    const dateStr = this.dateInSaoPaulo(new Date(payload.dataAgendamento));

    try {
      await ctx.cal.events.patch({
        calendarId: ctx.calendarId,
        eventId,
        requestBody: {
          summary:     `${payload.ambienteNome} — ${payload.osNumero}`,
          description: this.buildDescription(payload),
          colorId:     this.colorId(payload.status),
          start: { dateTime: `${dateStr}T08:00:00`, timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: `${dateStr}T10:00:00`, timeZone: 'America/Sao_Paulo' },
        },
      });
    } catch (err) {
      this.logger.error(`Erro ao atualizar evento ${eventId}:`, err);
    }
  }

  async excluirEvento(eventId: string): Promise<void> {
    const ctx = await this.getClientAndCalendarId();
    if (!ctx) return;
    try {
      await ctx.cal.events.delete({ calendarId: ctx.calendarId, eventId });
    } catch (err) {
      this.logger.error(`Erro ao excluir evento ${eventId}:`, err);
    }
  }
}
