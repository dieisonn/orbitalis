'use client'

import { useState, useTransition } from 'react'
import { gerarConvite } from '@/lib/convites'
import { Link2, Copy, Check, Loader2 } from 'lucide-react'

type Props = {
  tipo: 'tecnico' | 'cliente'
  clienteId?: string
  label?: string
  variant?: 'button' | 'link'
}

export function ConvidarBtn({ tipo, clienteId, label, variant = 'button' }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function gerar() {
    setError(null)
    startTransition(async () => {
      try {
        const token = await gerarConvite(tipo, clienteId)
        setLink(`${window.location.origin}/convite/${token}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao gerar convite')
      }
    })
  }

  async function copiar() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (link) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={link}>
          {link.replace(/^https?:\/\/[^/]+/, '…')}
        </span>
        <button
          onClick={copiar}
          title={copied ? 'Copiado!' : 'Copiar link'}
          className="shrink-0 p-1 rounded hover:bg-primary/10 text-primary transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
      </div>
    )
  }

  if (error) {
    return <span className="text-xs text-destructive">{error}</span>
  }

  const displayLabel = label ?? (tipo === 'tecnico' ? 'Convidar técnico' : 'Convidar cliente')

  if (variant === 'link') {
    return (
      <button
        onClick={gerar}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/70 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
        {displayLabel}
      </button>
    )
  }

  return (
    <button
      onClick={gerar}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary/5 disabled:opacity-50 transition-colors"
    >
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
      {displayLabel}
    </button>
  )
}
