import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';

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
  private calendar: calendar_v3.Calendar | null = null;
  private readonly calendarId: string | null;

  constructor() {
    const clientEmail  = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    this.calendarId    = process.env.GOOGLE_CALENDAR_ID ?? null;

    if (clientEmail && privateKey && this.calendarId) {
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.log('Google Calendar configurado');
    } else {
      this.logger.warn('Google Calendar não configurado — integração desativada');
    }
  }

  private buildDescription(p: CalendarEventPayload): string {
    const tipoLabel = p.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva';
    const linhas = [
      `${p.osNumero}`,
      `Cliente: ${p.clienteNome}`,
      p.clienteTelefone ? `Telefone: ${p.clienteTelefone}` : null,
      p.tecnicoNome ? `Técnico: ${p.tecnicoNome}` : null,
      `Tipo: ${tipoLabel}`,
      '',
      'Equipamentos:',
      ...p.equipamentos.map((e) => `- ${e}`),
      p.observacoesGerais ? `\nObs: ${p.observacoesGerais}` : null,
    ];
    return linhas.filter((l) => l !== null).join('\n');
  }

  private colorId(status: string): string {
    // Google Calendar color IDs: 1=lavanda, 2=sage, 3=grape, 4=flamingo,
    // 5=banana, 6=tangerine, 7=peacock, 8=graphite, 9=blueberry, 10=basil, 11=tomato
    const map: Record<string, string> = {
      aberta:       '7',  // peacock (azul)
      agendada:     '6',  // tangerine (laranja)
      em_andamento: '5',  // banana (amarelo)
      concluida:    '2',  // sage (verde)
      cancelada:    '8',  // graphite (cinza)
    };
    return map[status] ?? '7';
  }

  async criarEvento(payload: CalendarEventPayload): Promise<string | null> {
    if (!this.calendar || !this.calendarId) return null;

    const start = new Date(payload.dataAgendamento);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2);

    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: `${payload.ambienteNome} — ${payload.osNumero}`,
          description: this.buildDescription(payload),
          colorId: this.colorId(payload.status),
          start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: end.toISOString(),   timeZone: 'America/Sao_Paulo' },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
      });
      const eventId = res.data.id ?? null;
      this.logger.log(`Evento criado no Google Calendar: ${eventId}`);
      return eventId;
    } catch (err) {
      this.logger.error('Falha ao criar evento no Google Calendar:', err);
      return null;
    }
  }

  async atualizarEvento(eventId: string, payload: CalendarEventPayload): Promise<void> {
    if (!this.calendar || !this.calendarId) return;

    const start = new Date(payload.dataAgendamento);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2);

    try {
      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          summary:     `${payload.ambienteNome} — ${payload.osNumero}`,
          description: this.buildDescription(payload),
          colorId:     this.colorId(payload.status),
          start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: end.toISOString(),   timeZone: 'America/Sao_Paulo' },
        },
      });
      this.logger.log(`Evento atualizado no Google Calendar: ${eventId}`);
    } catch (err) {
      this.logger.error(`Falha ao atualizar evento ${eventId}:`, err);
    }
  }

  async excluirEvento(eventId: string): Promise<void> {
    if (!this.calendar || !this.calendarId) return;
    try {
      await this.calendar.events.delete({ calendarId: this.calendarId, eventId });
      this.logger.log(`Evento removido do Google Calendar: ${eventId}`);
    } catch (err) {
      this.logger.error(`Falha ao excluir evento ${eventId}:`, err);
    }
  }
}
