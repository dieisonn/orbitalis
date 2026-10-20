'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Trash2, Loader2, Copy, Check, ClipboardList } from 'lucide-react'

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

type GerarOsProps = {
  orcamentoId: string
  /** ambiente já definido no orçamento (se houver) */
  ambienteId: string | null
  ambientes: { id: string; nome: string }[]
}

/** Aparece em orçamento aprovado que ainda não gerou O.S. (ex.: cliente com vários ambientes). */
export function GerarOsPanel({ orcamentoId, ambienteId, ambientes }: GerarOsProps) {
  const router = useRouter()
  const [ambiente, setAmbiente] = useState(ambienteId ?? (ambientes.length === 1 ? ambientes[0].id : ''))
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setErro('')
    setLoading(true)
    try {
      const res = await fetch(`/api/orcamentos/${orcamentoId}/gerar-os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambienteId: ambiente || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : (data.message ?? 'Erro ao gerar a O.S.'))
      router.refresh()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao gerar a O.S.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <select
        value={ambiente} onChange={(e) => setAmbiente(e.target.value)}
        className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Escolha o ambiente…</option>
        {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      <button
        onClick={gerar} disabled={loading || !ambiente}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ClipboardList size={12} />}
        Gerar O.S.
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
