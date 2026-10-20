import { api } from '@/lib/api'

export type LinhaTipo = {
  chave: string; sigla: string; nome: string; corHex: string
  total: number; concluidos: number; emAndamento: number; agendados: number; cancelados: number
  minutos: number; percentual: number
}
export type RelatorioAgenda = {
  periodo: { inicio: string; fim: string }
  truncado: boolean
  total: number
  horas: number
  retrabalho: { total: number; percentual: number }
  resumo: { preventivas: number; corretivas: number; visitas: number; retrabalho: number }
  tipos: LinhaTipo[]
  tecnicos: { id: string | null; nome: string; total: number; porTipo: Record<string, number> }[]
  meses: { mes: string; total: number; porTipo: Record<string, number> }[]
}

export type Filtros = { inicio?: string; fim?: string; tecnicoId?: string; clienteId?: string }

export function queryDoRelatorio(f: Filtros) {
  const qs = new URLSearchParams()
  if (f.inicio) qs.set('inicio', f.inicio)
  if (f.fim) qs.set('fim', f.fim)
  if (f.tecnicoId) qs.set('tecnicoId', f.tecnicoId)
  if (f.clienteId) qs.set('clienteId', f.clienteId)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const buscarRelatorio = (f: Filtros) =>
  api.get<RelatorioAgenda>(`/agenda/relatorio${queryDoRelatorio(f)}`)
