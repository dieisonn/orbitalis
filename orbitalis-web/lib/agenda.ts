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

// ─── Repetição de eventos ────────────────────────────────────────────────────
// A API ainda não tem "série": cada repetição vira um evento independente,
// criado pelo mesmo endpoint de evento avulso.

export type Unidade = 'dia' | 'semana' | 'mes' | 'ano'
export type Regra = {
  intervalo: number            // a cada N unidades
  unidade: Unidade
  diasSemana: number[]         // 0=dom … 6=sáb (só para unidade 'semana')
  fim: { tipo: 'vezes'; vezes: number } | { tipo: 'ate'; ate: Dia }
}

export const MAX_REPETICOES = 100

const ultimoDiaDoMes = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/** Datas das ocorrências (a primeira é o próprio dia inicial). Mês curto: usa o último dia. */
export function gerarOcorrencias(inicio: Dia, regra: Regra): Dia[] {
  const out: Dia[] = []
  const passo = Math.max(1, Math.floor(regra.intervalo) || 1)
  const limiteVezes = regra.fim.tipo === 'vezes' ? Math.max(1, Math.floor(regra.fim.vezes) || 1) : MAX_REPETICOES + 1
  const ate = regra.fim.tipo === 'ate' ? regra.fim.ate : null
  const passouDoFim = (d: Dia) => !!ate && diffDias(ate, d) > 0 // d depois de ate
  const cheio = () => out.length >= Math.min(limiteVezes, MAX_REPETICOES + 1)

  if (regra.unidade === 'semana') {
    const dias = regra.diasSemana.length ? [...regra.diasSemana].sort() : [diaDaSemana(inicio)]
    const domingo = somarDias(inicio, -diaDaSemana(inicio)) // início da semana do evento
    for (let s = 0; !cheio() && s < 5000; s += passo) {
      for (const ds of dias) {
        const d = somarDias(domingo, s * 7 + ds)
        if (diffDias(d, inicio) > 0) continue            // antes do início
        if (passouDoFim(d)) return out
        out.push(d)
        if (cheio()) break
      }
    }
    return out
  }

  for (let i = 0; !cheio() && i < 5000; i++) {
    let d: Dia
    if (regra.unidade === 'dia') d = somarDias(inicio, i * passo)
    else if (regra.unidade === 'mes') {
      const total = inicio.m + i * passo
      const y = inicio.y + Math.floor(total / 12), m = ((total % 12) + 12) % 12
      d = { y, m, d: Math.min(inicio.d, ultimoDiaDoMes(y, m)) }
    } else {
      const y = inicio.y + i * passo
      d = { y, m: inicio.m, d: Math.min(inicio.d, ultimoDiaDoMes(y, inicio.m)) }
    }
    if (passouDoFim(d)) break
    out.push(d)
  }
  return out
}

// ─── Cores ───────────────────────────────────────────────────────────────────
export const COR_PADRAO = '#039BE5'
/** Paleta de 24 cores (mesma ideia do Google Agenda) */
export const PALETA = [
  '#AD1457', '#D81B60', '#E67C73', '#D50000', '#F4511E', '#EF6C00', '#F09300', '#F6BF26', '#E4C441',
  '#C0CA33', '#7CB342', '#0B8043', '#33B679', '#009688', '#039BE5', '#4285F4', '#7986CB', '#3F51B5',
  '#B39DDB', '#9E69AF', '#8E24AA', '#795548', '#616161', '#A79B8E',
]
/** Cor que o evento teria sem personalização: a do tipo de serviço, ou a padrão */
export const corPadraoDe = (e: Pick<EventoAgenda, 'tipoServico'>) => e.tipoServico?.corHex ?? COR_PADRAO
