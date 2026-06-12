'use client'

import { useState, useMemo } from 'react'
import { Building2, Cpu, ChevronDown, Search, X } from 'lucide-react'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletarAmbiente } from './actions'

type Equipamento = {
  id: string
  nome: string
  tipoEquipamento: string
}

type Ambiente = {
  id: string
  nome: string
  metrosQuadrados: number
  capacidadeTermica: string
  localizacaoInterna: string
  equipamentos: Equipamento[]
}

type Grupo = {
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  ambientes: Ambiente[]
}

export function AmbientesList({ grupos }: { grupos: Grupo[] }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(grupos.map((g) => g.cliente.id)),
  )

  function toggle(clienteId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(clienteId)) next.delete(clienteId)
      else next.add(clienteId)
      return next
    })
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return grupos
    const q = query.toLowerCase()
    return grupos.flatMap((g) => {
      const clienteMatch = (g.cliente.nomeFantasia ?? g.cliente.razaoSocial)
        .toLowerCase()
        .includes(q)
      const ambsFiltrados = clienteMatch
        ? g.ambientes
        : g.ambientes.filter(
            (a) =>
              a.nome.toLowerCase().includes(q) ||
              a.localizacaoInterna?.toLowerCase().includes(q),
          )
      if (ambsFiltrados.length === 0) return []
      return [{ ...g, ambientes: ambsFiltrados }]
    })
  }, [grupos, query])

  const totalFiltrado = filtered.reduce((s, g) => s + g.ambientes.length, 0)

  return (
    <div>
      {/* Barra de pesquisa */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por cliente, ambiente ou localização…"
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">
            {query ? `Nenhum resultado para "${query}"` : 'Nenhum ambiente cadastrado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {query && (
            <p className="text-xs text-gray-400 px-1">
              {totalFiltrado} ambiente(s) em {filtered.length} cliente(s)
            </p>
          )}

          {filtered.map(({ cliente, ambientes: ambs }) => {
            const isCollapsed = collapsed.has(cliente.id)
            const totalEqs = ambs.reduce((s, a) => s + (a.equipamentos?.length ?? 0), 0)

            return (
              <div key={cliente.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  type="button"
                  onClick={() => toggle(cliente.id)}
                  className="w-full flex items-center justify-between px-6 py-3 bg-primary/5 border-b border-border hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={14}
                      className={`text-primary/60 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                    <span className="font-bold text-primary text-sm">
                      {cliente.nomeFantasia ?? cliente.razaoSocial}
                    </span>
                    {cliente.nomeFantasia && (
                      <span className="text-xs text-gray-400">{cliente.razaoSocial}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {ambs.length} ambiente(s) · {totalEqs} equipamento(s)
                  </span>
                </button>

                {/* Tabela (ocultável) */}
                {!isCollapsed && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        {['Ambiente', 'Localização Interna', 'Área', 'Cap. Térmica', 'Equipamentos', ''].map((h) => (
                          <th
                            key={h}
                            className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ambs.map((a) => (
                        <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-gray-900">{a.nome}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{a.localizacaoInterna}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {Number(a.metrosQuadrados).toFixed(0)} m²
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{a.capacidadeTermica}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                              <Cpu size={10} />
                              {a.equipamentos?.length ?? 0}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`/ambientes/${a.id}/editar`}
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                Editar
                              </a>
                              <DeleteButton action={deletarAmbiente.bind(null, a.id)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
