// Horários da agenda: o Brasil não tem horário de verão desde 2019, então São Paulo é UTC-3 fixo.
// inicio/fim são guardados como instantes (UTC); a O.S. guarda o dia (meia-noite UTC) + "HH:MM" local.
export const OFFSET_SP_MIN = -180;
export const HORA_PADRAO = '08:00';
export const DURACAO_PADRAO_MIN = 60;

const MS_MIN = 60_000;

/** "HH:MM" (ou null) → minutos desde 00:00; inválido vira null. */
export function minutosDoDia(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}

/** Dia (UTC, como a O.S. grava) + minutos do dia local → instante. */
export function instanteLocal(dia: Date, minutos: number): Date {
  const meiaNoiteUtc = Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate());
  return new Date(meiaNoiteUtc + (minutos - OFFSET_SP_MIN) * MS_MIN);
}

/** Instante → relógio local de São Paulo. */
export function relogioLocal(instante: Date) {
  const l = new Date(instante.getTime() + OFFSET_SP_MIN * MS_MIN);
  return {
    dia: new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())),
    minutos: l.getUTCHours() * 60 + l.getUTCMinutes(),
  };
}

export const paraHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Início e fim do evento de uma O.S. — fim explícito (se válido) ou início + duração do tipo. */
export function janelaDaOs(
  dia: Date,
  horaInicio: string | null | undefined,
  horaFim: string | null | undefined,
  duracaoMin: number | null | undefined,
) {
  const ini = minutosDoDia(horaInicio) ?? minutosDoDia(HORA_PADRAO)!;
  const fimInformado = minutosDoDia(horaFim);
  const dur = duracaoMin && duracaoMin > 0 ? duracaoMin : DURACAO_PADRAO_MIN;
  const fim = fimInformado !== null && fimInformado > ini ? fimInformado : ini + dur;
  return { inicio: instanteLocal(dia, ini), fim: instanteLocal(dia, fim) };
}
