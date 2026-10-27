import { api } from '@/lib/api'
import Link from 'next/link'
import { BarChart3, CalendarDays, Printer } from 'lucide-react'
import { AgendaClient } from './agenda-client'
import type { ClienteOpcao, TecnicoOpcao, TipoOpcao } from './evento-modal'

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ v?: string; d?: string }> }) {
  const { v, d } = await searchParams
  const [tipos, clientesRes, tecnicosRes, config] = await Promise.all([
    api.get<TipoOpcao[]>('/tipos-servico').catch(() => [] as TipoOpcao[]),
    api.get<{ data: ClienteOpcao[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as ClienteOpcao[] })),
    api.get<{ data: TecnicoOpcao[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as TecnicoOpcao[] })),
    api.get<{ cidade?: string | null; uf?: string | null }>('/configuracao').catch(() => ({} as { cidade?: string | null; uf?: string | null })),
  ])

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays size={22} />
            Agenda
          </h1>
          <div className="flex flex-wrap gap-2 justify-end">
            <Link href="/ordens-servico/dia" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-white border border-border rounded-md hover:bg-surface">
              <Printer size={14} /> Imprimir O.S. do dia
            </Link>
            <Link href="/agenda/relatorio" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-white border border-border rounded-md hover:bg-surface">
            <BarChart3 size={14} /> Relatório de atendimentos
          </Link>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Toda O.S. agendada aparece aqui com título, endereço e descrição. Clique num dia para criar um evento.
        </p>
      </div>
      <AgendaClient tipos={tipos} clientes={clientesRes.data} tecnicos={tecnicosRes.data} cidade={config.cidade ?? null} uf={config.uf ?? null} visaoInicial={v} dataInicial={d} />
    </div>
  )
}
