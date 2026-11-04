'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopiarConvite({ token }: { token: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button"
      onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/convite/${token}`); setOk(true); setTimeout(() => setOk(false), 2500) }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
      {ok ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />} {ok ? 'Copiado!' : 'Copiar link'}
    </button>
  )
}
