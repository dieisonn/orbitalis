'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Período do relatório na URL (?de=&ate=) + atalhos. Padrão do servidor: últimos 90 dias.
export function FiltroPeriodo({ de, ate, children }: { de: string; ate: string; children?: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const [d1, setD1] = useState(de)
  const [d2, setD2] = useState(ate)

  function ir(novoDe: string, novoAte: string, extra?: Record<string, string>) {
    const q = new URLSearchParams(sp.toString())
    q.set('de', novoDe); q.set('ate', novoAte)
    for (const [k, v] of Object.entries(extra ?? {})) v ? q.set(k, v) : q.delete(k)
    router.replace(`${path}?${q.toString()}`)
  }

  const hoje = new Date()
  const atalhos: { t: string; de: string; ate: string }[] = [
    { t: '30 dias', de: iso(new Date(hoje.getTime() - 29 * 86400000)), ate: iso(hoje) },
    { t: '90 dias', de: iso(new Date(hoje.getTime() - 89 * 86400000)), ate: iso(hoje) },
    { t: 'Este mês', de: iso(new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), 1))), ate: iso(hoje) },
    { t: 'Este ano', de: `${hoje.getFullYear()}-01-01`, ate: iso(hoje) },
    { t: 'Ano passado', de: `${hoje.getFullYear() - 1}-01-01`, ate: `${hoje.getFullYear() - 1}-12-31` },
  ]

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="flex items-center gap-1.5">
        <input type="date" value={d1} onChange={(e) => setD1(e.target.value)} aria-label="De" className="px-3 py-2 border border-border rounded-lg text-sm bg-white" />
        <span className="text-xs text-gray-400">até</span>
        <input type="date" value={d2} onChange={(e) => setD2(e.target.value)} aria-label="Até" className="px-3 py-2 border border-border rounded-lg text-sm bg-white" />
        <button onClick={() => ir(d1, d2)} className="px-3 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90">Aplicar</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {atalhos.map((a) => (
          <button key={a.t} onClick={() => { setD1(a.de); setD2(a.ate); ir(a.de, a.ate) }}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-full border ${a.de === de && a.ate === ate ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}`}>
            {a.t}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
