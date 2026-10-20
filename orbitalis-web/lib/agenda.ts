// Tipos e utilitários da agenda. Todos os horários são exibidos no fuso de São Paulo (UTC-3 fixo:
// o Brasil não tem horário de verão desde 2019), independentemente do fuso do navegador.

export type EventoAgenda = {
  id: string
  titulo: string
  descricao: string | null
  local: string | null
  inicio: string
  fim: string
  diaInteiro: boolean
  corHex: string
  personalizado: boolean
  tipoServico: { id: string; sigla: string; nome: string; corHex: string; duracaoMinutos: number } | null
  tecnico: { id: string; nome: string } | null
  cliente: { id: string; nome: string; telefone: string | null; endereco: string } | null
  ordemServico: { id: string; numero: string; status: string } | null
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const OFFSET_MS = -3 * 3600_000
export const DIA_MS = 86_400_000

export type Dia = { y: number; m: number; d: number }

/** Instante → relógio de São Paulo */
export function relogio(iso: string | Date) {
  const l = new Date(new Date(iso).getTime() + OFFSET_MS)
  return {
    y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(),
    hh: l.getUTCHours(), mm: l.getUTCMinutes(), dow: l.getUTCDay(),
  }
}

/** Relógio de São Paulo → instante ISO (aceita d/hh/mm fora da faixa: o JS normaliza) */
export function instante(y: number, m: number, d: number, hh = 0, mm = 0): string {
  return new Date(Date.UTC(y, m, d, hh, mm) - OFFSET_MS).toISOString()
}

export const hoje = (): Dia => { const r = relogio(new Date()); return { y: r.y, m: r.m, d: r.d } }

export function somarDias(dia: Dia, n: number): Dia {
  const x = new Date(Date.UTC(dia.y, dia.m, dia.d + n))
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate() }
}

export const chaveDia = (dia: Dia) =>
  `${dia.y}-${String(dia.m + 1).padStart(2, '0')}-${String(dia.d).padStart(2, '0')}`

export const chaveDoInstante = (iso: string) => { const r = relogio(iso); return chaveDia(r) }

export const mesmoDia = (a: Dia, b: Dia) => a.y === b.y && a.m === b.m && a.d === b.d

export const diaDaSemana = (dia: Dia) => new Date(Date.UTC(dia.y, dia.m, dia.d)).getUTCDay()

/** Diferença em dias (b - a) */
export const diffDias = (a: Dia, b: Dia) =>
  Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / DIA_MS)

export const hhmm = (iso: string) => {
  const r = relogio(iso)
  return `${String(r.hh).padStart(2, '0')}:${String(r.mm).padStart(2, '0')}`
}

export const dataBR = (dia: Dia) =>
  `${String(dia.d).padStart(2, '0')}/${String(dia.m + 1).padStart(2, '0')}/${dia.y}`

export function duracaoLegivel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** "Seg, 21 de outubro" */
export const diaPorExtenso = (dia: Dia) =>
  `${DIAS_SEMANA[diaDaSemana(dia)]}, ${dia.d} de ${MESES[dia.m].toLowerCase()}`

// Navegação até o local — só links, sem nenhuma integração/conta
export const mapaUrl = (local: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`
export const wazeUrl = (local: string) =>
  `https://waze.com/ul?q=${encodeURIComponent(local)}&navigate=yes`

export const STATUS_OS_LABEL: Record<string, string> = {
  aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em andamento',
  concluida: 'Concluída', cancelada: 'Cancelada',
}
