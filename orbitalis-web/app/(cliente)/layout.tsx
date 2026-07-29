'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  ClipboardList,
  ReceiptText,
  LogOut,
} from 'lucide-react'

const NAV = [
  { href: '/meu-painel',      label: 'Painel',         icon: LayoutDashboard },
  { href: '/meus-ambientes',  label: 'Meus Ambientes', icon: Building2 },
  { href: '/abrir-chamado',   label: 'Abrir Chamado',  icon: PlusCircle },
  { href: '/historico',       label: 'Histórico',       icon: ClipboardList },
  { href: '/meus-orcamentos', label: 'Orçamentos',      icon: ReceiptText },
]

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/meu-painel') return path === href
    return path === href || path.startsWith(href + '/')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex flex-col w-56 min-h-screen bg-primary text-white shrink-0 print:hidden">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="bg-white rounded-md px-2 py-1.5 inline-flex items-center">
            <img src="/logo.png" alt="Orbitalis" className="h-6 w-auto object-contain" />
          </div>
          <p className="text-[10px] text-white/50 mt-2 uppercase tracking-widest">
            Portal do Cliente
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                ].join(' ')}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-white/10">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/8"
            >
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
