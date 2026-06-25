'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Lock, Loader2 } from 'lucide-react'
import type { TipoServico } from './page'

const CALENDAR_COLORS: { id: string; label: string; hex: string }[] = [
  { id: '7',  label: 'Azul (Peacock)',    hex: '#039BE5' },
  { id: '10', label: 'Verde (Basil)',     hex: '#0B8043' },
  { id: '2',  label: 'Verde claro (Sage)',hex: '#33B679' },
  { id: '5',  label: 'Amarelo (Banana)',  hex: '#F6BF26' },
  { id: '6',  label: 'Laranja (Tang.)',   hex: '#F4511E' },
  { id: '11', label: 'Vermelho (Tomato)', hex: '#D50000' },
  { id: '3',  label: 'Roxo (Grape)',      hex: '#8E24AA' },
  { id: '4',  label: 'Rosa (Flamingo)',   hex: '#E67C73' },
  { id: '9',  label: 'Az. escuro (Blue)', hex: '#3F51B5' },
  { id: '1',  label: 'Lavanda',           hex: '#7986CB' },
  { id: '8',  label: 'Cinza (Graphite)',  hex: '#616161' },
]

type FormData = {
  sigla: string
  nome: string
  corHex: string
  calendarColorId: string
  valorPadrao: string
}

const EMPTY: FormData = { sigla: '', nome: '', corHex: '#0B8043', calendarColorId: '10', valorPadrao: '' }

async function apiCall(method: string, path: string, body?: object) {
  const res = await fetch(`/api/tipos-servico-proxy?path=${encodeURIComponent(path)}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Erro ${res.status}`)
  }
  return res.json().catch(() => null)
}

export function ServicosClient({ tipos: inicial }: { tipos: TipoServico[] }) {
  const [tipos, setTipos] = useState<TipoServico[]>(inicial)
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [editando, setEditando] = useState<TipoServico | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  function abrirNovo() {
    setForm(EMPTY)
    setEditando(null)
    setError(null)
    setModal('novo')
  }

  function abrirEditar(ts: TipoServico) {
    setForm({
      sigla:           ts.sigla,
      nome:            ts.nome,
      corHex:          ts.corHex,
      calendarColorId: ts.calendarColorId,
      valorPadrao:     ts.valorPadrao != null ? String(ts.valorPadrao) : '',
    })
    setEditando(ts)
    setError(null)
    setModal('editar')
  }

  function fechar() { setModal(null); setEditando(null); setError(null) }

  async function recarregar() {
    const res = await fetch('/api/tipos-servico-proxy?path=%2Ftipos-servico').then(r => r.json())
    if (Array.isArray(res)) setTipos(res)
  }

  function salvar() {
    setError(null)
    startTransition(async () => {
      try {
        const body = {
          sigla:           form.sigla.trim().toUpperCase(),
          nome:            form.nome.trim(),
          corHex:          form.corHex,
          calendarColorId: form.calendarColorId,
          valorPadrao:     form.valorPadrao ? parseFloat(form.valorPadrao) : null,
        }
        if (modal === 'novo') {
          await apiCall('POST', '/tipos-servico', body)
        } else if (editando) {
          await apiCall('PATCH', `/tipos-servico/${editando.id}`, {
            nome:            body.nome,
            corHex:          body.corHex,
            calendarColorId: body.calendarColorId,
            valorPadrao:     body.valorPadrao,
          })
        }
        await recarregar()
        fechar()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  function excluir(ts: TipoServico) {
    if (!confirm(`Excluir "${ts.nome}"? Essa ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await apiCall('DELETE', `/tipos-servico/${ts.id}`)
        await recarregar()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir')
      }
    })
  }

  const ativos   = tipos.filter((t) => t.ativo)
  const inativos = tipos.filter((t) => !t.ativo)

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-sm font-semibold text-gray-700">{tipos.length} tipos cadastrados</span>
          <button
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
          >
            <Plus size={14} />
            Novo Tipo
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sigla</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cor</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Google Agenda</th>
              <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor Padrão</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ativos.map((ts) => (
              <TipoRow key={ts.id} ts={ts} onEditar={abrirEditar} onExcluir={excluir} isPending={isPending} />
            ))}
            {inativos.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-xs text-gray-400 bg-surface font-medium">
                    Inativos
                  </td>
                </tr>
                {inativos.map((ts) => (
                  <TipoRow key={ts.id} ts={ts} onEditar={abrirEditar} onExcluir={excluir} isPending={isPending} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {modal === 'novo' ? 'Novo Tipo de Serviço' : `Editar — ${editando?.nome}`}
            </h2>

            <div className="space-y-4">
              {modal === 'novo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sigla *</label>
                  <input
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase().slice(0, 5) })}
                    placeholder="VT"
                    maxLength={5}
                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Visita Técnica"
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor (HEX)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.corHex}
                      onChange={(e) => setForm({ ...form, corHex: e.target.value })}
                      className="h-10 w-10 rounded border border-border cursor-pointer"
                    />
                    <input
                      value={form.corHex}
                      onChange={(e) => setForm({ ...form, corHex: e.target.value })}
                      maxLength={7}
                      className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Padrão (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valorPadrao}
                    onChange={(e) => setForm({ ...form, valorPadrao: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor no Google Agenda</label>
                <select
                  value={form.calendarColorId}
                  onChange={(e) => setForm({ ...form, calendarColorId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {CALENDAR_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded"
                    style={{ backgroundColor: CALENDAR_COLORS.find((c) => c.id === form.calendarColorId)?.hex ?? '#039BE5' }}
                  />
                  <span className="text-xs text-gray-500">Prévia da cor no calendário</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={fechar}
                className="flex-1 py-2.5 border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={isPending || !form.nome.trim() || (modal === 'novo' && !form.sigla.trim())}
                className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin inline" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TipoRow({
  ts, onEditar, onExcluir, isPending,
}: {
  ts: TipoServico
  onEditar: (ts: TipoServico) => void
  onExcluir: (ts: TipoServico) => void
  isPending: boolean
}) {
  const cor = CALENDAR_COLORS.find((c) => c.id === ts.calendarColorId)
  return (
    <tr className={`hover:bg-surface transition-colors ${!ts.ativo ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center justify-center w-10 h-7 rounded text-white text-xs font-bold"
          style={{ backgroundColor: ts.corHex }}
        >
          {ts.sigla}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">{ts.nome}</td>
      <td className="hidden md:table-cell px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ts.corHex }} />
          <span className="text-xs font-mono text-gray-500">{ts.corHex}</span>
        </div>
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: cor?.hex ?? '#039BE5' }} />
          <span className="text-xs text-gray-500">{cor?.label ?? `#${ts.calendarColorId}`}</span>
        </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-sm">
        {ts.valorPadrao != null
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(ts.valorPadrao))
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEditar(ts)}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded"
          >
            <Pencil size={14} />
          </button>
          {ts.sistema ? (
            <span title="Tipo padrão — não pode ser excluído" className="p-1.5 text-gray-200">
              <Lock size={14} />
            </span>
          ) : (
            <button
              onClick={() => onExcluir(ts)}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-destructive transition-colors rounded"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
