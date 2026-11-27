'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { brl, dataBr, hojeIso, somaDiasIso, type AFaturar } from '@/lib/financeiro'
import { gerarReceberDoOrcamento } from './actions'

export function AFaturarPainel({ itens }: { itens: AFaturar[] }) {
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [vencs, setVencs] = useState<Record<string, string>>({})

  function gerar(o: AFaturar) {
    setErro(null)
    iniciar(async () => {
      const r = await gerarReceberDoOrcamento(o.id, o.parcelas > 0 ? undefined : (vencs[o.id] || somaDiasIso(hojeIso(), 30)))
      if (!r.ok) setErro(r.erro)
    })
  }

  if (itens.length === 0) return null
  return (
    <section aria-labelledby="a-faturar" className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <h2 id="a-faturar" className="text-sm font-bold text-amber-900 flex items-center gap-2"><Receipt size={15} aria-hidden /> Orçamentos aprovados sem cobrança ({itens.length})</h2>
      <p className="text-xs text-amber-800 mt-0.5">Gere as contas a receber para o valor entrar no fluxo de caixa. Se o orçamento tem parcelas, elas viram uma conta cada.</p>
      <ul className="mt-3 divide-y divide-amber-200">
        {itens.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm">
            <div className="flex-1 min-w-[12rem]">
              <Link href={`/orcamentos/${o.id}`} className="font-semibold text-amber-950 hover:underline">#{String(o.numero).padStart(4, '0')} · {o.titulo}</Link>
              <p className="text-xs text-amber-800">{o.cliente} · aprovado em {dataBr(o.aprovadoEm)} · {o.parcelas > 0 ? `${o.parcelas} parcela${o.parcelas > 1 ? 's' : ''}` : 'sem parcelas'}</p>
            </div>
            <span className="font-semibold text-amber-950">{brl(o.total)}</span>
            {o.parcelas === 0 && (
              <label className="flex items-center gap-1.5 text-xs text-amber-900">Vence em
                <input type="date" value={vencs[o.id] ?? somaDiasIso(hojeIso(), 30)} onChange={(e) => setVencs({ ...vencs, [o.id]: e.target.value })}
                  className="px-2 py-1.5 border border-amber-300 rounded-lg bg-white text-sm" aria-label={`Vencimento do orçamento ${o.numero}`} />
              </label>
            )}
            <button type="button" disabled={pendente} onClick={() => gerar(o)} className="px-3 py-2 text-xs font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-50">
              Gerar contas a receber
            </button>
          </li>
        ))}
      </ul>
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    </section>
  )
}
