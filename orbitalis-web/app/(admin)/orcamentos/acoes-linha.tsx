'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2 } from 'lucide-react'

export function AcoesLinhaOrcamento({ id, numero, status, temOs }: { id: string; numero: number; status: string; temOs: boolean }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const rotulo = `#${String(numero).padStart(4, '0')}`

  async function excluir() {
    if (temOs) { alert('Este orçamento já gerou uma O.S. e não pode ser excluído.'); return }
    if (!confirm(status === 'aprovado' ? `Excluir o orçamento ${rotulo} aprovado? A baixa de estoque será devolvida.` : `Excluir o orçamento ${rotulo}?`)) return
    setCarregando(true)
    const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(Array.isArray(d.message) ? d.message[0] : (d.message ?? 'Não foi possível excluir'))
      setCarregando(false)
      return
    }
    router.refresh()
    setCarregando(false)
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/orcamentos/${id}/editar`} aria-label={`Editar orçamento ${rotulo}`} title="Editar" className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-surface">
        <Pencil size={14} />
      </Link>
      <button type="button" onClick={excluir} disabled={carregando} aria-label={`Excluir orçamento ${rotulo}`} title="Excluir" className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50">
        {carregando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  )
}
