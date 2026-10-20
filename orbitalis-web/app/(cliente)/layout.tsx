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
  { href: '/meu-painel',      label: 'Painel',        icon: LayoutDashboard },
  { href: '/meus-ambientes',  label: 'Ambientes',     icon: Building2 },
  { href: '/abrir-chamado',   label: 'Chamado', icon: PlusCircle },
  { href: '/historico',       label: 'Histórico',     icon: ClipboardList },
  { href: '/meus-orcamentos', label: 'Orçamentos',    icon: ReceiptText },
]

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  function isActive(href: string) {
    return path === href || path.startsWith(href + '/')
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Menu lateral — telas médias e grandes */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 h-screen bg-[var(--nav-bg)] border-r border-[var(--nav-border)] print:hidden">
        <div className="px-3 pt-3 pb-2">
          <div className="bg-white rounded-md h-14 px-3 flex items-center justify-center border border-[var(--nav-border)]">
            <img src="/logo.png" alt="Orbitalis" className="max-h-10 w-auto max-w-full object-contain" />
          </div>
          <p className="text-xs text-gray-500 mt-2 px-1">Portal do cliente</p>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-px" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={[
                  'relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-md text-[13.5px] transition-colors',
                  ativo
                    ? 'bg-white text-primary font-semibold shadow-[0_0_0_1px_var(--nav-border)]'
                    : 'text-gray-700 hover:bg-white/60 hover:text-gray-900',
                ].join(' ')}
              >
                {ativo && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-action" />}
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-2 border-t border-[var(--nav-border)]">
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[13.5px] text-gray-600 hover:text-gray-900 hover:bg-white/70 rounded-md transition-colors">
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Barra superior — celular */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-3 bg-[var(--nav-bg)] border-b border-[var(--nav-border)] print:hidden">
        <img src="/logo.png" alt="Orbitalis" className="h-8 w-auto object-contain" />
        <span className="text-sm text-gray-600">Portal do cliente</span>
        <form action={logout} className="ml-auto">
          <button type="submit" className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-white/70">
            <LogOut size={15} /> Sair
          </button>
        </form>
      </header>

      <main className="flex-1 min-w-0 px-4 pt-[4.5rem] pb-24 md:p-8 print:p-0">{children}</main>

      {/* Navegação inferior — celular */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-white border-t border-border safe-pb print:hidden" aria-label="Principal">
        {NAV.map(({ href, label, icon: Icon }) => {
          const ativo = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
                ativo ? 'text-action' : 'text-gray-500',
              ].join(' ')}
            >
              <Icon size={20} />
              <span className="truncate max-w-full px-0.5">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
