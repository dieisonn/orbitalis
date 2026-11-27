'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { LIMITES, LIMITE_PADRAO } from '@/lib/paginacao'
const CHAVE = 'orbitalis_itens_por_pagina'

/** Rodapé de lista paginada: "1–50 de 320", página anterior/próxima e itens por página (lembra a escolha do usuário). */
export function Paginacao({ total, pagina, limite }: { total: number; pagina: number; limite: number }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()

  const ir = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') p.delete(k); else p.set(k, v) }
    router.push(`${path}${p.size ? `?${p}` : ''}`)
  }

  // sem ?limite= na URL, aplica a preferência salva neste navegador
  useEffect(() => {
    if (sp.get('limite')) return
    try {
      const salvo = Number(localStorage.getItem(CHAVE))
      if (LIMITES.includes(salvo) && salvo !== LIMITE_PADRAO) {
        const p = new URLSearchParams(sp.toString()); p.set('limite', String(salvo)); p.delete('pagina')
        router.replace(`${path}?${p}`)
      }
    } catch { /* sem armazenamento: usa o padrão */ }
  }, [sp, path, router])

  const paginas = Math.max(1, Math.ceil(total / limite))
  const de = total === 0 ? 0 : (pagina - 1) * limite + 1
  const ate = Math.min(total, pagina * limite)
  const btn = 'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-border rounded-lg bg-white hover:bg-surface disabled:opacity-40 disabled:hover:bg-white'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-gray-600">
      <span>{total === 0 ? 'Nenhum item' : `${de}–${ate} de ${total}`}</span>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-gray-500">Por página</span>
          <select value={limite} aria-label="Itens por página" className="px-2 py-1.5 border border-border rounded-lg bg-white"
            onChange={(e) => { try { localStorage.setItem(CHAVE, e.target.value) } catch { /* ok */ } ir({ limite: e.target.value, pagina: null }) }}>
            {LIMITES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <button type="button" className={btn} disabled={pagina <= 1} onClick={() => ir({ pagina: String(pagina - 1) })}><ChevronLeft size={14} /> Anterior</button>
        <span className="tabular-nums">Página {pagina} de {paginas}</span>
        <button type="button" className={btn} disabled={pagina >= paginas} onClick={() => ir({ pagina: String(pagina + 1) })}>Próxima <ChevronRight size={14} /></button>
      </div>
    </div>
  )
}
