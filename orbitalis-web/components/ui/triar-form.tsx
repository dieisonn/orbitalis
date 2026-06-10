'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { triarOs, cancelarOs } from '@/app/(admin)/ordens-servico/actions'
import { UserCheck, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

type Tecnico = { id: string; email: string }

type Props = {
  osId: string
  status: string
  tecnicos: Tecnico[]
}

export function TriarForm({ osId, status, tecnicos }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isTerminal = status === 'concluida' || status === 'cancelada'
  if (isTerminal) return null

  function handleTriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const tecnicoId = (form.elements.namedItem('tecnicoId') as HTMLSelectElement).value
    const dataAgendamento = (form.elements.namedItem('dataAgendamento') as HTMLInputElement).value

    setError(null)
    startTransition(async () => {
      const result = await triarOs(osId, tecnicoId, dataAgendamento)
      if (!result.ok) {
        setError(result.error ?? 'Erro ao despachar')
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function handleCancelar() {
    if (!confirm('Cancelar esta O.S.? Ação irreversível.')) return
    startTransition(async () => {
      await cancelarOs(osId)
      router.refresh()
    })
  }

  const hoje = new Date().toISOString().split('T')[0]

  if (status !== 'aberta') {
    return (
      <div className="text-right">
        <button
          onClick={handleCancelar}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 disabled:opacity-60 transition-colors"
        >
          <XCircle size={12} />
          {isPending ? '…' : 'Cancelar O.S.'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative text-right">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action text-white rounded-lg hover:bg-action/90 transition-colors"
      >
        <UserCheck size={12} />
        Triar
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 p-4 bg-white border border-border rounded-xl shadow-xl text-left w-64">
          <p className="text-xs font-semibold text-primary mb-3">Despachar O.S.</p>

          <form onSubmit={handleTriar} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Técnico responsável</label>
              <select
                name="tecnicoId"
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="">Selecione…</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Data de atendimento</label>
              <input
                name="dataAgendamento"
                type="date"
                required
                min={hoje}
                defaultValue={hoje}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 bg-action text-white text-xs font-semibold rounded-lg hover:bg-action/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Despachando…' : 'Despachar'}
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                disabled={isPending}
                className="px-3 py-2 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/20 disabled:opacity-60 transition-colors"
                title="Cancelar O.S."
              >
                <XCircle size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
