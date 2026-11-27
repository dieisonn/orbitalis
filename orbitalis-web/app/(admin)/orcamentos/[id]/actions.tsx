'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, Trash2, Loader2, Copy, Check, ClipboardList, Pencil, Paperclip, Download, Upload } from 'lucide-react'
import { STATUS_LABEL, STATUS_ORDEM } from '@/lib/orcamento'

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
    if (!confirm(orc.status === 'aprovado' ? 'Excluir este orçamento aprovado? A baixa de estoque será devolvida.' : 'Excluir este orçamento?')) return
    setLoading('excluir')
    const res = await fetch(`/api/orcamentos/${orc.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(Array.isArray(d.message) ? d.message[0] : (d.message ?? 'Não foi possível excluir'))
      setLoading(null)
      return
    }
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
      {orc.status !== 'rascunho' && (
        <button
          onClick={copiarLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-gray-900 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-500" /> Copiado</> : <><Copy size={12} /> Copiar link</>}
        </button>
      )}
      {orc.status === 'rascunho' && (
        <button
          onClick={enviar} disabled={loading === 'enviar'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors"
        >
          {loading === 'enviar' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Enviar ao cliente
        </button>
      )}
      <Link href={`/orcamentos/${orc.id}/editar`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-gray-900 rounded-lg hover:bg-muted/50 transition-colors">
        <Pencil size={12} /> Editar
      </Link>
      {(
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
        className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Escolha o ambiente…</option>
        {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      <button
        onClick={gerar} disabled={loading || !ambiente}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ClipboardList size={12} />}
        Gerar O.S.
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}

/** Troca manual de status (qualquer direção). A baixa de estoque acompanha: aprovar baixa, sair de aprovado devolve. */
export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'aviso'; texto: string } | null>(null)

  async function trocar(novo: string) {
    if (novo === status) return
    setMsg(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/orcamentos/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novo }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : (d.message ?? 'Erro ao mudar o status'))
      const avisos: string[] = d.avisos ?? []
      if (avisos.length) setMsg({ tipo: 'aviso', texto: avisos.join(' ') })
      router.refresh()
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message ?? 'Erro ao mudar o status' })
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs text-gray-500">
        Status
        <select value={status} disabled={loading} onChange={(e) => trocar(e.target.value)} aria-label="Status do orçamento"
          className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg disabled:opacity-50">
          {STATUS_ORDEM.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {loading && <Loader2 size={12} className="animate-spin" />}
      </label>
      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`text-xs ${msg.tipo === 'erro' ? 'text-red-600' : 'text-amber-700'}`}>{msg.texto}</p>}
    </div>
  )
}

type Anexo = { id: string; nome: string; tipo: string; tamanho: number; criadoEm: string }
const fmtTam = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export function AnexosPanel({ orcamentoId, anexos }: { orcamentoId: string; anexos: Anexo[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    setErro('')
    if (arq.size > 3 * 1024 * 1024) { setErro('Arquivo maior que 3 MB'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('arquivo', arq)
      const res = await fetch(`/api/orcamentos/${orcamentoId}/anexos`, { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : (d.message ?? 'Erro ao anexar'))
      router.refresh()
    } catch (err: any) { setErro(err.message ?? 'Erro ao anexar') } finally { setLoading(false) }
  }

  async function remover(a: Anexo) {
    if (!confirm(`Remover o anexo "${a.nome}"?`)) return
    const res = await fetch(`/api/orcamentos/${orcamentoId}/anexos/${a.id}`, { method: 'DELETE' })
    if (!res.ok) { setErro('Não foi possível remover'); return }
    router.refresh()
  }

  return (
    <div className="bg-white border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Paperclip size={14} aria-hidden /> Anexos</h2>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface cursor-pointer">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Anexar arquivo
          <input type="file" className="sr-only" disabled={loading} onChange={enviar} accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx" />
        </label>
      </div>
      {anexos.length === 0 ? <p className="text-sm text-gray-500">Nenhum anexo. PDF, imagem, Word ou Excel, até 3 MB.</p> : (
        <ul className="divide-y divide-border">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-gray-900">{a.nome}</span>
              <span className="text-xs text-gray-500 shrink-0">{fmtTam(a.tamanho)}</span>
              <a href={`/api/orcamentos/${orcamentoId}/anexos/${a.id}`} aria-label={`Baixar ${a.nome}`} className="p-1 text-gray-500 hover:text-primary"><Download size={14} /></a>
              <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => remover(a)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {erro && <p role="alert" className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
