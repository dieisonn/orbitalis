'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusOs } from './actions'
import { PlayCircle, CheckCircle2, Loader2 } from 'lucide-react'

type Props = {
  osId: string
  currentStatus: string
}

export function OsStatusButtons({ osId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleStatus(status: string) {
    setError(null)
    startTransition(async () => {
      try {
        await atualizarStatusOs(osId, status)
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar status'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Atualizar Status</p>

      <div className="flex flex-col sm:flex-row gap-3">
        {currentStatus === 'agendada' || currentStatus === 'aberta' ? (
          <button
            onClick={() => handleStatus('em_andamento')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-warning text-primary font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={16} />}
            Iniciar Serviço
          </button>
        ) : null}

        {currentStatus === 'em_andamento' || currentStatus === 'agendada' || currentStatus === 'aberta' ? (
          <button
            onClick={() => handleStatus('concluida')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-action text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Concluir O.S.
          </button>
        ) : null}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  )
}
