'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreVertical, UserCheck, RefreshCw, DollarSign,
  FileText, Trash2, XCircle, ChevronLeft, Check, ClipboardList,
} from 'lucide-react'
import { triarOs, cancelarOs, alterarStatusOs } from '@/app/(admin)/ordens-servico/actions'
import { registrarFinanceiro } from '@/app/(admin)/ordens-servico/financeiro-action'
import { excluirOs } from '@/app/(admin)/ordens-servico/excluir-os-action'

type Tecnico  = { id: string; email: string; nome: string | null }
type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
type Panel    = 'menu' | 'triar' | 'cancelar' | 'status' | 'financeiro' | 'excluir'

const STATUS_LABELS: Record<OsStatus, string> = {
  aberta:       'Aberta',
  agendada:     'Agendada',
  em_andamento: 'Em Andamento',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
}
const ALL_STATUS: OsStatus[] = ['aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada']

function fmt(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Header shared by every sub-panel ─────────────────────────────────────────
function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface/60">
      <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded">
        <ChevronLeft size={15} />
      </button>
      <span className="text-xs font-semibold text-gray-700">{title}</span>
    </div>
  )
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function TriarPanel({ osId, tecnicos, back, close }: { osId: string; tecnicos: Tecnico[]; back: () => void; close: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const hoje = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const tecnicoId       = (form.elements.namedItem('tecnicoId') as HTMLSelectElement).value
    const dataAgendamento = (form.elements.namedItem('dataAgendamento') as HTMLInputElement).value
    setError(null)
    startTransition(async () => {
      const result = await triarOs(osId, tecnicoId, dataAgendamento)
      if (!result.ok) { setError(result.error ?? 'Erro ao despachar'); return }
      close(); router.refresh()
    })
  }

  return (
    <div>
      <PanelHeader title="Triar / Despachar" onBack={back} />
      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Técnico responsável</label>
          <select name="tecnicoId" required
            className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            <option value="">Selecione…</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data de atendimento</label>
          <input name="dataAgendamento" type="date" required min={hoje} defaultValue={hoje}
            className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={pending}
          className="w-full py-2 bg-action text-white text-xs font-semibold rounded-lg hover:bg-action/90 disabled:opacity-60 transition-colors">
          {pending ? 'Despachando…' : 'Despachar'}
        </button>
      </form>
    </div>
  )
}

function CancelarPanel({ osId, back, close }: { osId: string; back: () => void; close: () => void }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancelar() {
    startTransition(async () => {
      await cancelarOs(osId)
      close(); router.refresh()
    })
  }

  return (
    <div>
      <PanelHeader title="Cancelar O.S." onBack={back} />
      <div className="p-3 space-y-3">
        <p className="text-xs text-gray-600">Deseja cancelar esta O.S.? A ação não pode ser desfeita.</p>
        <div className="flex gap-2">
          <button type="button" onClick={back}
            className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-50 transition-colors">
            Voltar
          </button>
          <button type="button" onClick={handleCancelar} disabled={pending}
            className="flex-1 py-1.5 text-xs font-semibold bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-colors">
            {pending ? '…' : 'Cancelar O.S.'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusPanel({ osId, status, back, close }: { osId: string; status: OsStatus; back: () => void; close: () => void }) {
  const [selected, setSelected] = useState<OsStatus>(status)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleConfirm() {
    if (selected === status) return
    setError(null)
    startTransition(async () => {
      const result = await alterarStatusOs(osId, selected)
      if (!result.ok) { setError(result.error ?? 'Erro'); return }
      close(); router.refresh()
    })
  }

  return (
    <div>
      <PanelHeader title="Alterar Status" onBack={back} />
      <div className="p-3 space-y-3">
        <select value={selected} onChange={(e) => setSelected(e.target.value as OsStatus)}
          className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
          {ALL_STATUS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={back}
            className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-50 transition-colors">
            Voltar
          </button>
          <button type="button" onClick={handleConfirm} disabled={selected === status || pending}
            className="flex-1 py-1.5 text-xs font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-40 transition-colors">
            {pending ? '…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FinanceiroPanel({ osId, valorMaoObra, valorPecas, back, close }: {
  osId: string; valorMaoObra: number | null; valorPecas: number | null; back: () => void; close: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd   = new FormData(e.currentTarget)
    const mao  = parseFloat((fd.get('mao')  as string).replace(',', '.')) || null
    const peca = parseFloat((fd.get('peca') as string).replace(',', '.')) || null
    startTransition(async () => {
      const result = await registrarFinanceiro(osId, mao, peca)
      if (!result.ok) return
      setOk(true)
      setTimeout(() => { setOk(false); close() }, 1200)
    })
  }

  return (
    <div>
      <PanelHeader title="Valores Financeiros" onBack={back} />
      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        {(valorMaoObra != null || valorPecas != null) && (
          <p className="text-xs text-gray-400">Atual: M.O. {fmt(valorMaoObra)} · Peças {fmt(valorPecas)}</p>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mão de Obra (R$)</label>
          <input name="mao" type="number" step="0.01" min="0" defaultValue={valorMaoObra ?? ''} placeholder="0,00"
            className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Peças (R$)</label>
          <input name="peca" type="number" step="0.01" min="0" defaultValue={valorPecas ?? ''} placeholder="0,00"
            className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {ok ? (
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check size={12} /> Salvo!
          </p>
        ) : (
          <button type="submit" disabled={pending}
            className="w-full py-2 text-xs font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-60 transition-colors">
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </form>
    </div>
  )
}

function ExcluirPanel({ osId, osNum, back }: { osId: string; osNum: string; back: () => void }) {
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!senha) return
    setError(null)
    startTransition(async () => {
      const result = await excluirOs(osId, senha)
      if (!result.ok) { setError(result.error ?? 'Erro ao excluir'); return }
    })
  }

  return (
    <div>
      <PanelHeader title={`Excluir ${osNum}`} onBack={back} />
      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <p className="text-xs text-gray-500">Ação irreversível. Confirme com sua senha de admin.</p>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha do admin" required
          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/30" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={back}
            className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-100 transition-colors">
            Voltar
          </button>
          <button type="submit" disabled={pending || !senha}
            className="flex-1 py-1.5 text-xs font-semibold bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-colors">
            {pending ? '…' : 'Excluir'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  osId: string
  status: OsStatus
  tecnicos: Tecnico[]
  valorMaoObra: number | null
  valorPecas: number | null
}

export function OsActionsMenu({ osId, status, tecnicos, valorMaoObra, valorPecas }: Props) {
  const [open, setOpen]   = useState(false)
  const [panel, setPanel] = useState<Panel>('menu')
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const [openUp, setOpenUp] = useState(false)
  const btnRef            = useRef<HTMLButtonElement>(null)

  const isTerminal = status === 'concluida' || status === 'cancelada'
  const osNum      = `OS-${osId.slice(0, 6).toUpperCase()}`

  function close() { setOpen(false); setPanel('menu') }

  function handleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const up = window.innerHeight - r.bottom < 320
      setOpenUp(up)
      setPos({ top: up ? r.top : r.bottom + 4, left: r.right - 208 })
    }
    setOpen((v) => !v)
    setPanel('menu')
  }

  const hasFinanceiro = valorMaoObra != null || valorPecas != null

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Ações"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={close} />

          {/* fixed: não é afetado por overflow-hidden dos ancestrais */}
          <div
            className="fixed z-50 bg-white border border-border rounded-xl shadow-xl w-52 overflow-hidden"
            style={openUp
              ? { bottom: window.innerHeight - pos.top + 4, left: pos.left }
              : { top: pos.top, left: pos.left }}
          >

            {panel === 'menu' && (
              <div className="py-1">
                {/* Detalhe — always visible */}
                <a
                  href={`/ordens-servico/${osId}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors"
                >
                  <ClipboardList size={14} className="text-primary shrink-0" />
                  Ver Detalhe
                </a>

                {/* PDF — always visible */}
                <a
                  href={`/ordens-servico/${osId}/pdf`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors"
                >
                  <FileText size={14} className="text-primary shrink-0" />
                  Ver PDF
                </a>

                {!isTerminal && (
                  <>
                    <div className="h-px bg-border mx-3 my-1" />

                    {status === 'aberta' ? (
                      <button type="button" onClick={() => setPanel('triar')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors">
                        <UserCheck size={14} className="text-action shrink-0" />
                        Triar / Despachar
                      </button>
                    ) : (
                      <button type="button" onClick={() => setPanel('status')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors">
                        <RefreshCw size={14} className="text-primary shrink-0" />
                        Alterar Status
                      </button>
                    )}

                    <button type="button" onClick={() => setPanel('financeiro')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors">
                      <DollarSign size={14} className="text-green-600 shrink-0" />
                      {hasFinanceiro ? 'Editar Valores' : 'Informar Valores'}
                    </button>

                    <div className="h-px bg-border mx-3 my-1" />

                    <button type="button" onClick={() => setPanel('cancelar')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition-colors">
                      <XCircle size={14} className="shrink-0" />
                      Cancelar O.S.
                    </button>
                  </>
                )}

                {isTerminal && (
                  <button type="button" onClick={() => setPanel('financeiro')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors">
                    <DollarSign size={14} className="text-green-600 shrink-0" />
                    {hasFinanceiro ? 'Editar Valores' : 'Informar Valores'}
                  </button>
                )}

                <div className="h-px bg-border mx-3 my-1" />

                <button type="button" onClick={() => setPanel('excluir')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="shrink-0" />
                  Excluir O.S.
                </button>
              </div>
            )}

            {panel === 'triar'      && <TriarPanel      osId={osId} tecnicos={tecnicos} back={() => setPanel('menu')} close={close} />}
            {panel === 'cancelar'   && <CancelarPanel   osId={osId} back={() => setPanel('menu')} close={close} />}
            {panel === 'status'     && <StatusPanel     osId={osId} status={status} back={() => setPanel('menu')} close={close} />}
            {panel === 'financeiro' && <FinanceiroPanel osId={osId} valorMaoObra={valorMaoObra} valorPecas={valorPecas} back={() => setPanel('menu')} close={close} />}
            {panel === 'excluir'    && <ExcluirPanel    osId={osId} osNum={osNum} back={() => setPanel('menu')} />}
          </div>
        </>
      )}
    </div>
  )
}
