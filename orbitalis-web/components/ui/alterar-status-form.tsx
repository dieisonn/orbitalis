'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { alterarStatusOs } from '@/app/(admin)/ordens-servico/actions'

type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

const LABELS: Record<OsStatus, string> = {
  aberta:       'Aberta',
  agendada:     'Agendada',
  em_andamento: 'Em Andamento',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
}

const ALL: OsStatus[] = ['aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada']

export function AlterarStatusForm({ osId, status }: { osId: string; status: OsStatus }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoStatus = e.target.value as OsStatus
    if (novoStatus === status) return
    setError(null)
    startTransition(async () => {
      const result = await alterarStatusOs(osId, novoStatus)
      if (!result.ok) { setError(result.error ?? 'Erro'); return }
      router.refresh()
    })
  }

  return (
    <div className="text-right">
      <select
        value={status}
        onChange={handleChange}
        disabled={pending}
        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 cursor-pointer"
      >
        {ALL.map((s) => (
          <option key={s} value={s}>{LABELS[s]}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  )
}
