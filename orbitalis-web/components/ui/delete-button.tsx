'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteButton({
  action,
  label = 'Excluir',
}: {
  action: () => Promise<unknown>
  label?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    if (!confirm('Tem certeza que deseja excluir? Esta ação não pode ser desfeita.')) return
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.includes('NEXT_REDIRECT')) {
          setError('Erro ao excluir. Tente novamente.')
        }
      }
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-40"
        title={label}
      >
        <Trash2 size={13} />
        {isPending ? '…' : label}
      </button>
      {error && (
        <p className="text-[10px] text-destructive mt-0.5 max-w-[120px] text-right">{error}</p>
      )}
    </div>
  )
}
