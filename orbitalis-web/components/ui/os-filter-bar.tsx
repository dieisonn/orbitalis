'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, X, AlertCircle } from 'lucide-react'

type Tecnico  = { id: string; email: string; nome: string | null }
type Cliente  = { id: string; razaoSocial: string; nomeFantasia: string | null }

type Props = {
  currentStatus?:    string
  currentQ?:         string
  currentTecnicoId?: string
  currentClienteId?: string
  currentDataInicio?: string
  currentDataFim?:   string
  currentOrderBy?:   string
  atrasadas?:        boolean
  tecnicos:          Tecnico[]
  clientes:          Cliente[]
}

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos os status' },
  { value: 'aberta',      label: 'Abertas' },
  { value: 'agendada',    label: 'Agendadas' },
  { value: 'em_andamento',label: 'Em Andamento' },
  { value: 'concluida',   label: 'Concluídas' },
  { value: 'cancelada',   label: 'Canceladas' },
]

const ORDER_OPTIONS = [
  { value: 'numero_desc', label: 'Mais recentes primeiro' },
  { value: 'numero_asc',  label: 'Mais antigas primeiro' },
  { value: 'data_desc',   label: 'Data agend. ↓' },
  { value: 'data_asc',    label: 'Data agend. ↑' },
]

export function OsFilterBar({
  currentStatus, currentQ, currentTecnicoId, currentClienteId,
  currentDataInicio, currentDataFim, currentOrderBy, atrasadas,
  tecnicos, clientes,
}: Props) {
  const router = useRouter()
  const [q, setQ] = useState(currentQ ?? '')

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      status:    currentStatus,
      q:         q || undefined,
      tecnicoId: currentTecnicoId,
      clienteId: currentClienteId,
      dataInicio:currentDataInicio,
      dataFim:   currentDataFim,
      orderBy:   currentOrderBy,
      atrasadas: atrasadas ? '1' : undefined,
      // reset page when any filter changes
      page: undefined,
    }
    const merged = { ...base, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v)
    }
    return `/ordens-servico?${next.toString()}`
  }

  const activeFilters = [
    currentStatus, currentQ, currentTecnicoId, currentClienteId,
    currentDataInicio, currentDataFim, atrasadas,
  ].filter(Boolean).length

  function clearAll() {
    setQ('')
    router.push('/ordens-servico')
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Linha 1: busca + status + atrasadas */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); router.push(buildUrl({ q: q || undefined, page: undefined })) }}
          className="relative flex-1"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ambiente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); router.push(buildUrl({ q: undefined })) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </form>

        <select
          value={atrasadas ? '' : (currentStatus ?? '')}
          onChange={(e) => router.push(buildUrl({ status: e.target.value || undefined, atrasadas: undefined }))}
          className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white min-w-[160px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={currentOrderBy ?? 'numero_desc'}
          onChange={(e) => router.push(buildUrl({ orderBy: e.target.value }))}
          className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white min-w-[180px]"
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => router.push(buildUrl({ atrasadas: atrasadas ? undefined : '1', status: undefined }))}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
            atrasadas
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-600 border-border hover:border-red-300 hover:text-red-600'
          }`}
        >
          <AlertCircle size={14} />
          Atrasadas
        </button>

        {activeFilters > 0 && (
          <button onClick={clearAll}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-800 border border-border rounded-lg bg-white transition-colors whitespace-nowrap">
            <X size={12} />
            Limpar ({activeFilters})
          </button>
        )}
      </div>

      {/* Linha 2: filtros avançados */}
      <div className="flex flex-wrap gap-2">
        <select
          value={currentTecnicoId ?? ''}
          onChange={(e) => router.push(buildUrl({ tecnicoId: e.target.value || undefined }))}
          className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="">Todos os técnicos</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
          ))}
        </select>

        <select
          value={currentClienteId ?? ''}
          onChange={(e) => router.push(buildUrl({ clienteId: e.target.value || undefined }))}
          className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white min-w-[180px]"
        >
          <option value="">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nomeFantasia ?? c.razaoSocial}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={currentDataInicio ?? ''}
            onChange={(e) => router.push(buildUrl({ dataInicio: e.target.value || undefined, atrasadas: undefined }))}
            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={currentDataFim ?? ''}
            onChange={(e) => router.push(buildUrl({ dataFim: e.target.value || undefined, atrasadas: undefined }))}
            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
      </div>
    </div>
  )
}
