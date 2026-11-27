'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Dir, Ordem } from '@/lib/ordenacao'

/** Lê a ordem atual da URL (para listas ordenadas no navegador). */
export function useOrdemUrl(permitidos: string[], padrao: Ordem): Ordem {
  const sp = useSearchParams()
  const o = sp.get('ordem')
  if (!o || !permitidos.includes(o)) return padrao
  return { ordem: o, dir: sp.get('dir') === 'desc' ? 'desc' : 'asc' }
}

/**
 * Cabeçalho de coluna clicável: 1º clique ordena crescente, 2º decrescente, 3º volta ao padrão da tela.
 * A escolha vai para a URL (?ordem=&dir=), então sobrevive ao recarregar e pode ser compartilhada.
 */
export function ThOrdenavel({ campo, atual, padrao, className = '', children }: {
  campo: string
  atual: Ordem
  padrao: Ordem
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const ativo = atual.ordem === campo
  const dir: Dir | null = ativo ? atual.dir : null
  const alinhaDireita = /\btext-right\b/.test(className)
  const alinhaCentro = /\btext-center\b/.test(className)

  const clicar = () => {
    const p = new URLSearchParams(sp.toString())
    p.delete('pagina'); p.delete('page')
    if (!ativo) { p.set('ordem', campo); p.set('dir', 'asc') }
    else if (dir === 'asc') { p.set('ordem', campo); p.set('dir', 'desc') }
    else { p.delete('ordem'); p.delete('dir') } // volta ao padrão
    router.push(`${path}${p.size ? `?${p}` : ''}`)
  }

  const Icone = !ativo ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={className} aria-sort={!ativo ? 'none' : dir === 'asc' ? 'ascending' : 'descending'}>
      <button
        type="button"
        onClick={clicar}
        className={`group inline-flex [text-transform:inherit] [letter-spacing:inherit] text-left items-center gap-1 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-primary rounded ${alinhaDireita ? 'flex-row-reverse' : ''} ${alinhaCentro ? 'justify-center' : ''}`}
        title="Clique para ordenar"
      >
        <span>{children}</span>
        <Icone className={`h-3 w-3 shrink-0 ${ativo ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'}`} aria-hidden />
      </button>
    </th>
  )
}
