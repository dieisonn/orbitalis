'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'

export function DeleteButton({
  action,
  label = 'Excluir',
}: {
  action: () => Promise<void>
  label?: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Tem certeza que deseja excluir? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await action()
      } catch {
        // redirect throws internally — ignore
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-40"
      title={label}
    >
      <Trash2 size={13} />
      {label}
    </button>
  )
}
