'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  Cpu,
  ClipboardList,
  CalendarClock,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',         label: 'Cockpit',           icon: LayoutDashboard },
  { href: '/clientes',          label: 'Clientes',          icon: Users },
  { href: '/ambientes',         label: 'Ambientes',         icon: Building2 },
  { href: '/equipamentos',      label: 'Equipamentos',      icon: Cpu },
  { href: '/ordens-servico',    label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/planos-manutencao', label: 'Planos Prev.',      icon: CalendarClock },
  { href: '/checklists',        label: 'Checklists',        icon: ClipboardCheck },
  { href: '/usuarios',          label: 'Técnicos',          icon: UserCog },
]

export default function Sidebar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-primary text-white rounded-lg shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'flex flex-col bg-primary text-white shrink-0 print:hidden',
          'fixed inset-y-0 left-0 z-50 w-64 md:w-56',
          'md:static md:translate-x-0',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="bg-white rounded-3xl p-3 flex items-center">
            <img
              src="/logo.png"
              alt="Orbitalis"
              className="h-12 w-auto object-contain"
            />
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden p-1 text-white/60 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/dashboard' && path.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/65 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-2 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
