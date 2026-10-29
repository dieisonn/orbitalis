'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsActionsMenu } from '@/components/ui/os-actions-menu'
import { OsPagination } from '@/components/ui/os-pagination'
import { alterarStatusLote } from './actions'
import { excluirOsLote, unirOsLote } from './excluir-os-action'
import { Trash2, X, Loader2, Layers } from 'lucide-react'

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
  orcamento_aprovado:        'Orçamento aprovado',
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
  const [excluindo, setExcluindo] = useState(false)
  const [unindo, setUnindo] = useState(false)

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
            <tr className="border-b border-border bg-gray-50 text-left">
              <th className="pl-4 pr-2 py-2.5 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  aria-label="Selecionar todas"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-2 sm:px-3 py-2.5">Nº</th>
              <th className="px-3 py-2.5 sm:min-w-[240px]">Cliente e ambiente</th>
              <th className="hidden sm:table-cell px-3 py-2.5">Status</th>
              <th className="hidden lg:table-cell px-3 py-2.5">Técnico</th>
              <th className="hidden sm:table-cell px-3 py-2.5">Data</th>
              <th className="hidden md:table-cell px-3 py-2.5 text-right">Itens</th>
              <th className="pl-3 pr-4 py-2.5 w-12"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordens.map((os) => {
              const cliente = os.ambiente?.cliente
              const clienteNome = cliente?.nomeFantasia ?? cliente?.razaoSocial
              const isSelected = selected.has(os.id)
              const numero = os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 4).toUpperCase()
              const tecnicoNome = os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : null
              const horario = os.horaInicio ? `${os.horaInicio}${os.horaFim ? ` – ${os.horaFim}` : ''}` : null
              return (
                <tr
                  key={os.id}
                  className={`align-top hover:bg-gray-50${isSelected ? ' bg-blue-50 hover:bg-blue-50' : ''}`}
                >
                  <td className="pl-4 pr-2 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      aria-label={`Selecionar O.S. ${numero}`}
                      checked={isSelected}
                      onChange={() => toggleOne(os.id)}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <a href={`/ordens-servico/${os.id}`} className="inline-flex items-center gap-1.5 font-semibold text-gray-900 hover:text-action">
                      {os.tipoServico && (
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: os.tipoServico.corHex }} aria-hidden />
                      )}
                      {os.tipoServico?.sigla ?? 'OS'}-{numero}
                    </a>
                    <div className="text-xs text-gray-500 mt-0.5">{ORIGEM_LABEL[os.origem] ?? os.origem}</div>
                  </td>
                  <td className="px-3 py-3">
                    <a href={`/ordens-servico/${os.id}`} className="block font-medium text-gray-900 hover:text-action">
                      {clienteNome ?? os.ambiente?.nome ?? '—'}
                    </a>
                    <div className="text-xs text-gray-500">{os.ambiente?.nome}</div>
                    {os.observacoesGerais && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-prose wrap-anywhere" title={os.observacoesGerais}>
                        {os.observacoesGerais}
                      </p>
                    )}
                    {/* Celular: status, técnico e data entram aqui */}
                    <div className="sm:hidden mt-2 space-y-1">
                      <StatusBadge status={os.status} data={os.dataAgendamento} />
                      <div className="text-xs text-gray-500">
                        {new Date(os.dataAgendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{horario ? ` · ${horario}` : ''}
                        {tecnicoNome ? ` · ${tecnicoNome}` : ''}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3">
                    <StatusBadge status={os.status} data={os.dataAgendamento} />
                  </td>
                  <td className="hidden lg:table-cell px-3 py-3 text-gray-700">
                    {tecnicoNome ?? <span className="text-gray-400">Sem técnico</span>}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap text-gray-700">
                    {new Date(os.dataAgendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    {horario && <div className="text-xs text-gray-500">{horario}</div>}
                  </td>
                  <td className="hidden md:table-cell px-3 py-3 text-right text-gray-700">
                    {os.itens?.length ?? 0}
                  </td>
                  <td className="pl-3 pr-4 py-2.5">
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
            {ordens.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
                  <p className="font-medium text-gray-700">Nenhuma O.S. encontrada</p>
                  <p className="text-sm text-gray-500 mt-1">Ajuste os filtros ou crie uma nova ordem de serviço.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Suspense>
          <OsPagination page={currentPage} total={total} perPage={perPage} />
        </Suspense>
      </div>

      {unindo && (
        <UnirLoteModal
          ids={Array.from(selected)}
          onFechar={() => setUnindo(false)}
          onUnido={() => { setUnindo(false); setSelected(new Set()); router.refresh() }}
        />
      )}

      {excluindo && (
        <ExcluirLoteModal
          ids={Array.from(selected)}
          onFechar={() => setExcluindo(false)}
          onExcluido={() => { setExcluindo(false); setSelected(new Set()); router.refresh() }}
        />
      )}

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
          <div className="w-px h-5 bg-white/20" />
          {selected.size >= 2 && (
            <button
              onClick={() => setUnindo(true)}
              className="inline-flex items-center gap-1.5 text-sky-200 hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              title="Junta as O.S. do mesmo cliente e dia em uma visita só"
            >
              <Layers size={14} /> Unir em visita
            </button>
          )}
          <button
            onClick={() => setExcluindo(true)}
            className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 text-sm font-semibold transition-colors"
          >
            <Trash2 size={14} /> Excluir
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

/** Confirmação com senha para excluir várias O.S. de uma vez (ação definitiva). */
function ExcluirLoteModal({ ids, onFechar, onExcluido }: { ids: string[]; onFechar: () => void; onExcluido: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!senha) return setErro('Digite a sua senha para confirmar.')
    setErro(null)
    startTransition(async () => {
      const r = await excluirOsLote(ids, senha)
      if (!r.ok) { setErro(r.error); return }
      onExcluido()
    })
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !pendente) onFechar() }}>
      <form onSubmit={confirmar} role="dialog" aria-modal="true" aria-labelledby="exl-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 id="exl-titulo" className="text-base font-bold text-gray-900">Excluir {ids.length} O.S.?</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-3">
          As O.S. selecionadas, seus itens e os eventos da agenda ligados a elas serão apagados <strong>de forma permanente</strong>. Não dá para desfazer.
        </p>
        <label htmlFor="exl-senha" className="block text-sm font-medium text-gray-700 mb-1">Confirme com a sua senha de login</label>
        <input id="exl-senha" type="password" autoFocus autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40" />
        {erro && <p role="alert" className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onFechar} disabled={pendente} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
          <button type="submit" disabled={pendente}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-60">
            {pendente && <Loader2 size={14} className="animate-spin" />} Excluir {ids.length}
          </button>
        </div>
      </form>
    </div>
  )
}


/** Une O.S. do mesmo cliente e dia em uma visita (uma O.S. e um evento na agenda). */
function UnirLoteModal({ ids, onFechar, onUnido }: { ids: string[]; onFechar: () => void; onUnido: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!senha) return setErro('Digite a sua senha para confirmar.')
    setErro(null)
    startTransition(async () => {
      const r = await unirOsLote(ids, senha)
      if (!r.ok) { setErro(r.error); return }
      onUnido()
    })
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !pendente) onFechar() }}>
      <form onSubmit={confirmar} role="dialog" aria-modal="true" aria-labelledby="uni-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 id="uni-titulo" className="text-base font-bold text-gray-900">Unir {ids.length} O.S. em uma visita?</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-2">
          Os equipamentos de todas as O.S. vão para a <strong>O.S. de menor número</strong>, cada um com o seu checklist, e as demais O.S. e seus eventos na agenda são apagados. A agenda fica com um evento só.
        </p>
        <p className="text-xs text-gray-500 mb-3">Precisam ser do mesmo cliente, data, tipo de serviço e técnico, e ainda sem execução.</p>
        <label htmlFor="uni-senha" className="block text-sm font-medium text-gray-700 mb-1">Confirme com a sua senha de login</label>
        <input id="uni-senha" type="password" autoFocus autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40" />
        {erro && <p role="alert" className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onFechar} disabled={pendente} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
          <button type="submit" disabled={pendente}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-60">
            {pendente && <Loader2 size={14} className="animate-spin" />} Unir {ids.length}
          </button>
        </div>
      </form>
    </div>
  )
}
