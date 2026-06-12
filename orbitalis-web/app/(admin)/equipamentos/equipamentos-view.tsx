'use client'

import { useState, useMemo } from 'react'
import {
  Cpu, Search, X, Printer, History, Pencil, TrendingUp,
  Layers, Sparkles, BadgeCheck,
} from 'lucide-react'
import { QrModal } from '@/components/ui/qr-modal'
import { DeleteButton } from '@/components/ui/delete-button'

export type EquipamentoItem = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  condicao: string | null
  dataInstalacao: string | null
  valorAquisicao: string | number | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  } | null
}

export type EquipamentosStats = {
  total: number
  tiposUnicos: number
  totalNovos: number
  valorTotal: number
}

type Props = {
  equipamentos: EquipamentoItem[]
  stats: EquipamentosStats
  deletarAction: (id: string) => Promise<void>
}

const TIPO_BADGE: Record<string, string> = {
  'Split Hi-Wall':   'bg-blue-100 text-blue-700',
  'Split Cassete':   'bg-indigo-100 text-indigo-700',
  'Split Piso-Teto': 'bg-violet-100 text-violet-700',
  'Split Dutado':    'bg-purple-100 text-purple-700',
  'Chiller':         'bg-sky-100 text-sky-700',
  'Fancoil':         'bg-cyan-100 text-cyan-700',
  'VRF / VRV':       'bg-teal-100 text-teal-700',
  'Janela':          'bg-green-100 text-green-700',
  'Cortina de Ar':   'bg-amber-100 text-amber-700',
  'Outro':           'bg-gray-100 text-gray-500',
}

function tipoBadgeClass(tipo: string) {
  return TIPO_BADGE[tipo] ?? 'bg-gray-100 text-gray-500'
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function EquipamentosView({ equipamentos, stats, deletarAction }: Props) {
  const [query, setQuery]           = useState('')
  const [tipoFilter, setTipoFilter] = useState<string | null>(null)
  const [condFilter, setCondFilter] = useState<'novo' | 'usado' | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const tipos = useMemo(
    () => Array.from(new Set(equipamentos.map((e) => e.tipoEquipamento))).sort(),
    [equipamentos],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return equipamentos.filter((e) => {
      if (tipoFilter && e.tipoEquipamento !== tipoFilter) return false
      if (condFilter && (e.condicao ?? '') !== condFilter) return false
      if (!q) return true
      const clienteNome =
        e.ambiente?.cliente?.nomeFantasia ?? e.ambiente?.cliente?.razaoSocial ?? ''
      return (
        e.nome.toLowerCase().includes(q) ||
        e.marca.toLowerCase().includes(q) ||
        (e.modelo ?? '').toLowerCase().includes(q) ||
        e.tipoEquipamento.toLowerCase().includes(q) ||
        (e.numeroSerie ?? '').toLowerCase().includes(q) ||
        (e.ambiente?.nome ?? '').toLowerCase().includes(q) ||
        clienteNome.toLowerCase().includes(q)
      )
    })
  }, [equipamentos, query, tipoFilter, condFilter])

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selecionados.size === filtered.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(filtered.map((e) => e.id)))
    }
  }

  function handleImprimirLote() {
    window.open(`/equipamentos/imprimir-lote?ids=${[...selecionados].join(',')}`, '_blank')
  }

  const allSelected = filtered.length > 0 && selecionados.size === filtered.length
  const hasFilters = !!query || !!tipoFilter || !!condFilter

  function clearFilters() {
    setQuery('')
    setTipoFilter(null)
    setCondFilter(null)
  }

  return (
    <div>
      {/* ── Stats cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Cpu size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-0.5">ativos cadastrados</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Layers size={18} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.tiposUnicos}</p>
            <p className="text-xs text-gray-400 mt-0.5">tipos diferentes</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.totalNovos}</p>
            <p className="text-xs text-gray-400 mt-0.5">equipamentos novos</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">
              {stats.valorTotal > 0 ? fmtBRL(stats.valorTotal) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">em aquisições</p>
          </div>
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, cliente, marca, nº série…"
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tipo + Condição chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Tipo:</span>
          <button
            onClick={() => setTipoFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              !tipoFilter
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-border hover:border-primary/40'
            }`}
          >
            Todos
          </button>
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(tipoFilter === t ? null : t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                tipoFilter === t
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-border hover:border-primary/40'
              }`}
            >
              {t}
            </button>
          ))}

          <span className="text-gray-200 mx-1 select-none">|</span>
          <span className="text-xs text-gray-400 font-medium">Condição:</span>
          {([null, 'novo', 'usado'] as const).map((c) => (
            <button
              key={c ?? 'todos'}
              onClick={() => setCondFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                condFilter === c
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-border hover:border-primary/40'
              }`}
            >
              {c === null ? 'Todos' : c === 'novo' ? 'Novo' : 'Usado'}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-destructive transition-colors"
            >
              <X size={11} /> Limpar filtros
            </button>
          )}
        </div>

        {hasFilters && (
          <p className="text-xs text-gray-400">
            {filtered.length} de {equipamentos.length} equipamento(s) encontrado(s)
          </p>
        )}
      </div>

      {/* ── Tabela ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Cpu size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">
            {hasFilters ? 'Nenhum equipamento corresponde aos filtros.' : 'Nenhum equipamento cadastrado.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden relative">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-border cursor-pointer accent-primary"
                    title="Selecionar todos"
                  />
                </th>
                {['Equipamento', 'Cliente / Ambiente', 'Marca / Modelo', 'Nº Série', 'Condição', 'QR Code', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((eq) => {
                const checked = selecionados.has(eq.id)
                const clienteNome =
                  eq.ambiente?.cliente?.nomeFantasia ?? eq.ambiente?.cliente?.razaoSocial
                const dataInst = fmtDate(eq.dataInstalacao)

                return (
                  <tr
                    key={eq.id}
                    className={`hover:bg-surface/60 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(eq.id)}
                        className="rounded border-border cursor-pointer accent-primary"
                      />
                    </td>

                    {/* Equipamento + tipo badge */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900 leading-snug">{eq.nome}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadgeClass(eq.tipoEquipamento)}`}>
                        {eq.tipoEquipamento}
                      </span>
                    </td>

                    {/* Cliente / Ambiente */}
                    <td className="px-4 py-3.5">
                      {eq.ambiente ? (
                        <>
                          <p className="text-xs font-semibold text-gray-800">{clienteNome}</p>
                          <p className="text-xs text-gray-400">{eq.ambiente.nome}</p>
                          {eq.ambiente.localizacaoInterna && (
                            <p className="text-xs text-gray-300">{eq.ambiente.localizacaoInterna}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Marca / Modelo */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700 font-medium">{eq.marca}</p>
                      {eq.modelo && <p className="text-xs text-gray-400">{eq.modelo}</p>}
                    </td>

                    {/* Nº Série */}
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                      {eq.numeroSerie || <span className="text-gray-300 not-italic font-sans">—</span>}
                    </td>

                    {/* Condição + data instalação */}
                    <td className="px-4 py-3.5">
                      {eq.condicao ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          eq.condicao === 'novo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          <BadgeCheck size={10} />
                          {eq.condicao === 'novo' ? 'Novo' : 'Usado'}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                      {dataInst && (
                        <p className="text-xs text-gray-400 mt-0.5">{dataInst}</p>
                      )}
                    </td>

                    {/* QR Code */}
                    <td className="px-4 py-3.5">
                      <QrModal equipamentoId={eq.id} codigoQr={eq.codigoQr} nome={eq.nome} />
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/equipamentos/${eq.id}/historico`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                          title="Histórico de custos"
                        >
                          <History size={11} />
                          Histórico
                        </a>
                        <a
                          href={`/equipamentos/${eq.id}/editar`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          <Pencil size={11} />
                          Editar
                        </a>
                        <DeleteButton action={deletarAction.bind(null, eq.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Bulk bar */}
          {selecionados.size > 0 && (
            <div className="sticky bottom-0 bg-primary text-white px-6 py-3 flex items-center justify-between rounded-b-2xl">
              <span className="text-sm font-semibold">
                {selecionados.size} equipamento{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelecionados(new Set())}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  Limpar seleção
                </button>
                <button
                  onClick={handleImprimirLote}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white text-primary text-sm font-bold rounded-lg hover:bg-white/90 transition-colors"
                >
                  <Printer size={14} />
                  Imprimir etiquetas
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
