'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'agendada', label: 'Agendadas' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
]

type Props = {
  currentStatus?: string
  currentQ?: string
}

export function OsFilterBar({ currentStatus, currentQ }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(currentQ ?? '')

  function buildUrl(status: string, query: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (query) params.set('q', query)
    const qs = params.toString()
    return `/ordens-servico${qs ? `?${qs}` : ''}`
  }

  function handleStatusChange(val: string) {
    router.push(buildUrl(val, q))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl(currentStatus ?? '', q))
  }

  function clearSearch() {
    setQ('')
    router.push(buildUrl(currentStatus ?? '', ''))
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-2">
      <form onSubmit={handleSearch} className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por Nº OS (ex: AB12CD) ou ambiente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
        {q && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </form>
      <div className="relative">
        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select
          value={currentStatus ?? ''}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="pl-9 pr-8 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none cursor-pointer min-w-[160px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
