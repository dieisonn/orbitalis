'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { alterarStatusOs } from '@/app/(admin)/ordens-servico/actions'
import { RefreshCw } from 'lucide-react'

type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

const LABELS: Record<OsStatus, string> = {
  aberta:       'Aberta',
  agendada:     'Agendada',
  em_andamento: 'Em Andamento',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
}

const ALL: OsStatus[] = ['aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada']

// data/hora atual de Brasília no formato do campo datetime-local
function dataDiferente(local: string) {
  if (!local) return false
  return Math.abs(new Date(`${local}:00-03:00`).getTime() - Date.now()) > 30 * 60_000
}

function agoraLocal() {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 16)
}

export function AlterarStatusForm({ osId, status }: { osId: string; status: OsStatus }) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<OsStatus>(status)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [quando, setQuando] = useState(agoraLocal)
  const [obs, setObs] = useState('')
  const router = useRouter()

  // Não exibe para status 'aberta' — o TriarForm já cuida dessa transição
  if (status === 'aberta') return null

  const changed = selected !== status

  function handleConfirm() {
    if (!changed) return
    setError(null)
    startTransition(async () => {
      const result = await alterarStatusOs(osId, selected, quando, obs)
      if (!result.ok) { setError(result.error ?? 'Erro'); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setSelected(status); setError(null); setQuando(agoraLocal()); setObs('') }}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
      >
        <RefreshCw size={11} />
        Alterar status
      </button>

      {open && (
        <div className="mt-2 p-3 bg-white border border-border rounded-xl shadow-md text-left w-64 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Novo status:</p>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as OsStatus)}
            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ALL.map((s) => (
              <option key={s} value={s}>{LABELS[s]}</option>
            ))}
          </select>
          {changed && selected !== 'aberta' && selected !== 'agendada' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {selected === 'concluida' ? 'Concluída em' : selected === 'em_andamento' ? 'Iniciada em' : 'Cancelada em'}
              </label>
              <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {dataDiferente(quando) && (
                <p role="alert" className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                  Atenção: a data é {new Date(`${quando}:00-03:00`).getTime() > Date.now() ? 'no futuro' : 'diferente de agora'}. Isso é permitido, mas o ideal é registrar o status quando ele acontece; o histórico mostrará a data informada e quando foi registrado.
                </p>
              )}
            </div>
          )}
          {changed && (
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Observação (opcional)"
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 text-xs border border-border rounded hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!changed || pending}
              className="flex-1 py-1.5 text-xs font-semibold bg-action text-white rounded hover:bg-action/90 disabled:opacity-40 transition-colors"
            >
              {pending ? '…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
