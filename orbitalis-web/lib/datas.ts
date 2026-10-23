// Datas "AAAA-MM-DD" (sem fuso) — cálculos feitos em UTC para não "andar" um dia
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** Hoje no horário de São Paulo (e não em UTC, que à noite já é "amanhã"). */
export const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

const paraUTC = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const paraISO = (d: Date) => d.toISOString().slice(0, 10)

export const somarDiasISO = (iso: string, n: number) => { const d = paraUTC(iso); d.setUTCDate(d.getUTCDate() + n); return paraISO(d) }

/** Soma meses mantendo o dia (31/01 + 1 mês = 28/02). */
export function somarMesesISO(iso: string, n: number) {
  const d = paraUTC(iso); const dia = d.getUTCDate()
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n)
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimo)); return paraISO(d)
}

/** Próxima ocorrência do dia da semana (0=dom … 6=sáb), sempre depois de `iso`. */
export function proximoDiaDaSemana(iso: string, dow: number) {
  const atual = paraUTC(iso).getUTCDay()
  return somarDiasISO(iso, ((dow - atual + 7) % 7) || 7)
}

export const diaDaSemanaISO = (iso: string) => SEMANA[paraUTC(iso).getUTCDay()]
export const iso2br = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

/** "05/11/2026" → "2026-11-05"; devolve '' se incompleta ou inexistente (ex.: 31/02). */
export function br2iso(br: string) {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  const iso = `${y}-${mo}-${d}`
  const dt = paraUTC(iso)
  return dt.getUTCFullYear() === Number(y) && dt.getUTCMonth() + 1 === Number(mo) && dt.getUTCDate() === Number(d) ? iso : ''
}
