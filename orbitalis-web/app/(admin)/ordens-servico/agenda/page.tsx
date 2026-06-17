import { api } from '@/lib/api'
import { CalendarOs } from '@/components/ui/calendar-os'
import { CalendarDays, List } from 'lucide-react'

type OsEvent = {
  id: string
  numero: number | null
  status: string
  tipo: string
  dataAgendamento: string
  ambienteNome: string
  clienteNome: string
  tecnicoNome: string | null
}

type OsRaw = {
  id: string
  numero: number | null
  status: string
  tipo: string
  dataAgendamento: string
  ambiente: { nome: string; cliente: { razaoSocial: string; nomeFantasia: string | null } | null }
  tecnico: { nome: string | null; email: string } | null
}

export default async function AgendaPage() {
  let events: OsEvent[] = []

  try {
    const res = await api.get<{ data: OsRaw[] }>('/ordens-servico?perPage=1000&orderBy=data_asc')
    events = res.data.map((os) => ({
      id: os.id,
      numero: os.numero,
      status: os.status,
      tipo: os.tipo,
      dataAgendamento: os.dataAgendamento,
      ambienteNome: os.ambiente?.nome ?? '—',
      clienteNome: os.ambiente?.cliente?.nomeFantasia ?? os.ambiente?.cliente?.razaoSocial ?? '—',
      tecnicoNome: os.tecnico?.nome ?? os.tecnico?.email ?? null,
    }))
  } catch {
    // retorna vazio
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <CalendarDays size={22} />
            Agenda de O.S.
          </h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} ordens de serviço no sistema</p>
        </div>
        <a
          href="/ordens-servico"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-semibold text-gray-600 rounded-lg hover:bg-surface transition-colors"
        >
          <List size={14} />
          Ver lista
        </a>
      </div>

      <CalendarOs events={events} />
    </div>
  )
}
