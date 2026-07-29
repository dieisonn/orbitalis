import { api } from '@/lib/api'
import { HistoricoList } from './historico-list'

export type OsHistorico = {
  id: string
  numero: number | null
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
  ambiente: { nome: string }
  tecnico: { email: string; nome: string | null } | null
  itens: { id: string; statusItem: string }[]
}

export default async function HistoricoPage() {
  let ordens: OsHistorico[] = []
  try {
    ordens = await api.get<OsHistorico[]>('/ordens-servico/meus')
  } catch {}

  return <HistoricoList ordens={ordens} />
}
