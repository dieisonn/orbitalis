'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { Campo, inputCls } from '@/components/ui/modal'
import { brl } from '@/lib/suprimentos'
import { salvarMarkup, type RegraMarkup } from '../actions'

type Linha = { categoria: string; percentual: string }
const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

export function MarkupClient({ inicial, categorias }: { inicial: RegraMarkup; categorias: string[] }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [padrao, setPadrao] = useState(String(inicial.padrao))
  const [linhas, setLinhas] = useState<Linha[]>(inicial.categorias.map((c) => ({ categoria: c.categoria, percentual: String(c.percentual) })))
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const exemplo = (pct: string) => { const n = num(pct); return Number.isNaN(n) ? '—' : brl(Math.round(100 * (1 + n / 100) * 100) / 100) }
  const livres = categorias.filter((c) => !linhas.some((l) => l.categoria.toLowerCase() === c.toLowerCase()))

  function salvar() {
    const p = num(padrao)
    if (Number.isNaN(p) || p < 0) { setErro('Informe o markup padrão (0 ou mais)'); return }
    for (const l of linhas) {
      if (!l.categoria.trim()) { setErro('Preencha o nome do grupo em todas as linhas'); return }
      if (Number.isNaN(num(l.percentual)) || num(l.percentual) < 0) { setErro(`Markup inválido no grupo "${l.categoria}"`); return }
    }
    setErro(null); setSalvo(false)
    iniciar(async () => {
      const r = await salvarMarkup({ padrao: p, categorias: linhas.map((l) => ({ categoria: l.categoria.trim(), percentual: num(l.percentual) })) })
      if (r.ok) { setSalvo(true); router.refresh() } else setErro(r.erro)
    })
  }

  return (
    <div className="max-w-3xl space-y-5">
      <section className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-gray-900">Markup geral</h2>
        <p className="text-xs text-gray-500 mt-1">Vale para todo produto cujo grupo não tenha regra própria.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Campo rotulo="Markup padrão (%)" className="w-48"><input value={padrao} onChange={(e) => { setPadrao(e.target.value); setSalvo(false) }} className={inputCls} inputMode="decimal" /></Campo>
          <p className="text-sm text-gray-600 pb-3">Exemplo: custo {brl(100)} → venda <strong>{exemplo(padrao)}</strong></p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-gray-900">Markup por grupo de produtos</h2>
        <p className="text-xs text-gray-500 mt-1">Ex.: Gases com margem diferente de Elétrica. A regra do grupo tem prioridade sobre a geral.</p>
        <div className="mt-4 space-y-3">
          {linhas.length === 0 && <p className="text-sm text-gray-500">Nenhuma regra por grupo.</p>}
          {linhas.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Campo rotulo="Grupo" className="flex-1 min-w-[10rem]">
                <input value={l.categoria} list="grupos-markup" onChange={(e) => { setLinhas(linhas.map((x, k) => (k === i ? { ...x, categoria: e.target.value } : x))); setSalvo(false) }} className={inputCls} />
              </Campo>
              <Campo rotulo="Markup (%)" className="w-32"><input value={l.percentual} onChange={(e) => { setLinhas(linhas.map((x, k) => (k === i ? { ...x, percentual: e.target.value } : x))); setSalvo(false) }} className={inputCls} inputMode="decimal" /></Campo>
              <p className="text-sm text-gray-600 pb-3 w-36">{brl(100)} → <strong>{exemplo(l.percentual)}</strong></p>
              <button type="button" onClick={() => { setLinhas(linhas.filter((_, k) => k !== i)); setSalvo(false) }} aria-label={`Remover regra de ${l.categoria || 'grupo'}`} className="p-2 mb-1 text-gray-500 hover:text-destructive"><Trash2 size={15} /></button>
            </div>
          ))}
          <datalist id="grupos-markup">{livres.map((c) => <option key={c} value={c} />)}</datalist>
          <button type="button" onClick={() => { setLinhas([...linhas, { categoria: '', percentual: padrao }]); setSalvo(false) }} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5"><Plus size={14} /> Adicionar grupo</button>
        </div>
      </section>

      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={pendente} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
          {pendente && <Loader2 size={14} className="animate-spin" />} Salvar markup
        </button>
        {salvo && <span role="status" className="inline-flex items-center gap-1 text-sm text-green-700"><CheckCircle2 size={15} /> Salvo</span>}
      </div>
      <p className="text-xs text-gray-500">Salvar não altera preços já cadastrados. Para recalcular, marque os produtos na lista e use “Aplicar markup padrão”.</p>
    </div>
  )
}
