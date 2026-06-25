'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { resolverTodosAlertas } from './actions'

export function ResolverTodosBtn({ total }: { total: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function handleClick() {
    if (!confirm(`Marcar ${total} alerta${total !== 1 ? 's' : ''} ativo${total !== 1 ? 's' : ''} como resolvido${total !== 1 ? 's' : ''}?`)) return
    startTransition(async () => {
      const res = await resolverTodosAlertas()
      if (res.ok) {
        setMsg(`${res.resolvidos} resolvido${res.resolvidos !== 1 ? 's' : ''}`)
        router.refresh()
      } else {
        setMsg(res.error ?? 'Erro')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-green-600 font-medium">{msg}</span>}
      <button
        onClick={handleClick}
        disabled={isPending || total === 0}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-border rounded-lg bg-white text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-50 transition-colors"
      >
        <CheckCheck size={14} />
        {isPending ? 'Resolvendo…' : 'Marcar todos como resolvido'}
      </button>
    </div>
  )
}
