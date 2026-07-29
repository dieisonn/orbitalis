'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Trash2, Loader2, Copy, Check } from 'lucide-react'

type Props = { orc: { id: string; status: string; tokenPublico: string } }

export function OrcamentoActions({ orc }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function enviar() {
    setLoading('enviar')
    await fetch(`/api/orcamentos/${orc.id}/enviar`, { method: 'POST' })
    router.refresh()
    setLoading(null)
  }

  async function excluir() {
    if (!confirm('Excluir este orçamento?')) return
    setLoading('excluir')
    await fetch(`/api/orcamentos/${orc.id}`, { method: 'DELETE' })
    router.push('/orcamentos')
  }

  function copiarLink() {
    const origin = window.location.origin
    navigator.clipboard.writeText(`${origin}/o/${orc.tokenPublico}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {orc.status === 'enviado' && (
        <button
          onClick={copiarLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-500" /> Copiado</> : <><Copy size={12} /> Copiar link</>}
        </button>
      )}
      {orc.status === 'rascunho' && (
        <button
          onClick={enviar} disabled={loading === 'enviar'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading === 'enviar' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Enviar ao cliente
        </button>
      )}
      {['rascunho', 'rejeitado', 'expirado'].includes(orc.status) && (
        <button
          onClick={excluir} disabled={loading === 'excluir'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'excluir' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Excluir
        </button>
      )}
    </div>
  )
}
