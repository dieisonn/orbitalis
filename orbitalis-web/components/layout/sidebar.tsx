'use client'

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

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-primary text-white shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-xl font-bold tracking-wide">Orbitalis</p>
        <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-widest">
          Gestão de Ativos
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
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
  )
}
