'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { href: '/financeiro', rotulo: 'Visão geral', exato: true },
  { href: '/financeiro/receber', rotulo: 'A receber' },
  { href: '/financeiro/pagar', rotulo: 'A pagar' },
  { href: '/financeiro/contas', rotulo: 'Contas e categorias' },
]

export function FinanceiroAbas() {
  const path = usePathname()
  return (
    <nav aria-label="Seções do financeiro" className="flex gap-1 border-b border-border overflow-x-auto">
      {ABAS.map((a) => {
        const ativa = a.exato ? path === a.href : path.startsWith(a.href)
        return (
          <Link key={a.href} href={a.href} aria-current={ativa ? 'page' : undefined}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${ativa ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {a.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
