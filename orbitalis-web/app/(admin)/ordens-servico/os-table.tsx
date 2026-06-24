'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsActionsMenu } from '@/components/ui/os-actions-menu'
import { OsPagination } from '@/components/ui/os-pagination'
import { alterarStatusLote } from './actions'

type OrdemServico = {
  id: string
  numero: number | null
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  observacoesGerais: string | null
  horaInicio: string | null
  horaFim: string | null
  ambiente: {
    nome: string
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  }
  tecnico: { id: string; email: string; nome: string | null } | null
  tipoServico: { sigla: string; nome: string; corHex: string } | null
  itens: { id: string; statusItem: string }[]
  valorMaoObra: number | null
  valorPecas: number | null
}

type Tecnico = { id: string; email: string; nome: string | null }

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente:        'Portal Cliente',
}

const STATUS_OPTIONS = [
  { value: 'concluida',    label: 'Concluída' },
  { value: 'cancelada',    label: 'Cancelada' },
  { value: 'agendada',     label: 'Agendada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aberta',       label: 'Aberta' },
]

type Props = {
  ordens: OrdemServico[]
  tecnicos: Tecnico[]
  currentPage: number
  total: number
  perPage: number
}

export function OsTable({ ordens, tecnicos, currentPage, total, perPage }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('concluida')
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const allSelected = ordens.length > 0 && selected.size === ordens.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ordens.map((o) => o.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function aplicarLote() {
    setErro(null)
    const ids = Array.from(selected)
    startTransition(async () => {
      const res = await alterarStatusLote(ids, bulkStatus)
      if (!res.ok) {
        setErro(res.error ?? 'Erro desconhecido')
        return
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                />
              </th>
              {['Nº', 'Cliente / Ambiente', 'Status', 'Origem', 'Técnico', 'Data', 'Itens', 'Ação'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordens.map((os) => {
              const cliente = os.ambiente?.cliente
              const clienteNome = cliente?.nomeFantasia ?? cliente?.razaoSocial
              const isSelected = selected.has(os.id)
              return (
                <tr
                  key={os.id}
                  className={`hover:bg-surface transition-colors align-middle${isSelected ? ' bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={isSelected}
                      onChange={() => toggleOne(os.id)}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {os.tipoServico ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-white text-xs font-bold"
                        style={{ backgroundColor: os.tipoServico.corHex }}
                      >
                        {os.tipoServico.sigla}-{os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 4).toUpperCase()}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-gray-500 font-semibold">
                        OS-{os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{os.ambiente?.nome ?? '—'}</div>
                    {clienteNome && (
                      <div className="text-xs text-gray-400 mt-0.5">{clienteNome}</div>
                    )}
                    {os.observacoesGerais && (
                      <div className="text-xs text-gray-400 mt-1 max-w-[220px] truncate italic" title={os.observacoesGerais}>
                        {os.observacoesGerais}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={os.status} />
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {ORIGEM_LABEL[os.origem] ?? os.origem}
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {os.tecnico ? (
                      <span>{os.tecnico.nome ?? os.tecnico.email}</span>
                    ) : (
                      <span className="italic text-gray-400">Não atribuído</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-gray-600">
                    {os.itens?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <OsActionsMenu
                      osId={os.id}
                      status={os.status}
                      tecnicos={tecnicos}
                      valorMaoObra={os.valorMaoObra ?? null}
                      valorPecas={os.valorPecas ?? null}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Suspense>
          <OsPagination page={currentPage} total={total} perPage={perPage} />
        </Suspense>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-semibold whitespace-nowrap">
            {selected.size} selecionada{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-5 bg-white/20" />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-white/20 focus:outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={aplicarLote}
            disabled={isPending}
            className="bg-white text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Aplicando…' : 'Aplicar'}
          </button>
          <button
            onClick={() => { setSelected(new Set()); setErro(null) }}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Limpar
          </button>
          {erro && <span className="text-red-400 text-xs ml-1">{erro}</span>}
        </div>
      )}
    </>
  )
}
