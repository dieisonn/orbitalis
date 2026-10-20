import { api } from '@/lib/api'
import { CalendarDays } from 'lucide-react'
import { AgendaClient } from './agenda-client'
import type { ClienteOpcao, TecnicoOpcao, TipoOpcao } from './evento-modal'

export default async function AgendaPage() {
  const [tipos, clientesRes, tecnicosRes] = await Promise.all([
    api.get<TipoOpcao[]>('/tipos-servico').catch(() => [] as TipoOpcao[]),
    api.get<{ data: ClienteOpcao[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as ClienteOpcao[] })),
    api.get<{ data: TecnicoOpcao[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as TecnicoOpcao[] })),
  ])

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <CalendarDays size={22} />
          Agenda
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Toda O.S. agendada aparece aqui com título, endereço e descrição. Clique num dia para criar um evento.
        </p>
      </div>
      <AgendaClient tipos={tipos} clientes={clientesRes.data} tecnicos={tecnicosRes.data} />
    </div>
  )
}
