'use client'

import { useEffect, useState } from 'react'
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
  Settings,
  Bell,
  FileText,
  FileSpreadsheet,
  CalendarDays,
  Briefcase,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SearchButton } from '@/components/ui/search-palette'

const NAV_GROUPS = [
  {
    label: 'Operação',
    defaultOpen: true,
    items: [
      { href: '/dashboard',             label: 'Cockpit',           icon: LayoutDashboard },
      { href: '/alertas',               label: 'Alertas',           icon: Bell },
      { href: '/ordens-servico/agenda', label: 'Agenda',            icon: CalendarDays },
      { href: '/ordens-servico',        label: 'Ordens de Serviço', icon: ClipboardList },
      { href: '/planos-manutencao',     label: 'Planos Prev.',      icon: CalendarClock },
    ],
  },
  {
    label: 'Cadastros',
    defaultOpen: true,
    items: [
      { href: '/clientes',    label: 'Clientes',    icon: Users },
      { href: '/contratos',   label: 'Contratos',   icon: FileText },
      { href: '/ambientes',   label: 'Ambientes',   icon: Building2 },
      { href: '/equipamentos', label: 'Equipamentos', icon: Cpu },
      { href: '/usuarios',    label: 'Técnicos',    icon: UserCog },
    ],
  },
  {
    label: 'Análise',
    defaultOpen: true,
    items: [
      { href: '/equipamentos/confiabilidade', label: 'Confiabilidade', icon: ShieldCheck },
      { href: '/relatorios',                  label: 'Relatórios',     icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Sistema',
    defaultOpen: false,
    items: [
      { href: '/checklists',    label: 'Checklists',       icon: ClipboardCheck },
      { href: '/servicos',      label: 'Tipos de Serviço', icon: Briefcase },
      { href: '/configuracoes', label: 'Configurações',    icon: Settings },
    ],
  },
]

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

const EXACT_ROUTES = new Set([
  '/dashboard',
  '/ordens-servico/agenda',
  '/equipamentos/confiabilidade',
])

function isActive(href: string, path: string): boolean {
  if (path === href) return true
  if (EXACT_ROUTES.has(href)) return false
  if (!path.startsWith(href + '/')) return false
  const moreSpecific = ALL_HREFS.find((h) => h !== href && h.startsWith(href + '/') && path.startsWith(h))
  return !moreSpecific
}

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null } | null

const STORAGE_KEY = 'orbitalis-nav-collapsed'

export default function Sidebar({ config, alertasCount = 0 }: { config?: Config; alertasCount?: number }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set(NAV_GROUPS.filter((g) => !g.defaultOpen).map((g) => g.label))
  )

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (Array.isArray(stored)) setCollapsed(new Set(stored))
    } catch { /* mantém default */ }
  }, [])

  function toggleGroup(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const logoSrc = config?.logoUrl || '/logo.png'
  const nomeExibido = config?.nomeFantasia || config?.nomeEmpresa || 'Orbitalis'

  return (
    <>
      {/* Hamburger — mobile */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-primary text-white rounded-lg shadow"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Overlay — mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'flex flex-col bg-primary text-white shrink-0 print:hidden',
          'fixed inset-y-0 left-0 z-50 w-56 md:w-48',
          'md:static md:translate-x-0',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="h-14 px-3.5 flex items-center justify-between shrink-0 border-b border-white/8">
          <div className="bg-white rounded-md px-2 py-1 flex items-center">
            <img src={logoSrc} alt={nomeExibido} className="h-7 w-auto object-contain" />
          </div>
          <button
            className="md:hidden p-1 text-white/40 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Busca */}
        <div className="px-2.5 py-2.5 border-b border-white/8">
          <SearchButton />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => {
            const isCollapsed = collapsed.has(group.label)
            return (
              <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
                {/* Cabeçalho do grupo — clicável */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] font-semibold text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors select-none"
                >
                  <ChevronDown
                    size={11}
                    className={['shrink-0 transition-transform duration-200', isCollapsed ? '-rotate-90' : ''].join(' ')}
                  />
                  {group.label}
                </button>

                {/* Itens com animação de altura */}
                <div
                  className={[
                    'overflow-hidden transition-all duration-200 ease-in-out space-y-0.5',
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100',
                  ].join(' ')}
                >
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href, path)
                    const isAlertas = href === '/alertas'
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={[
                          'flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] font-medium transition-colors',
                          active
                            ? 'bg-white/15 text-white'
                            : 'text-white/55 hover:bg-white/8 hover:text-white/90',
                        ].join(' ')}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                        {isAlertas && alertasCount > 0 && (
                          <span className="min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                            {alertasCount > 99 ? '99+' : alertasCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Rodapé: tema + logout */}
        <div className="px-2 py-2 border-t border-white/8 shrink-0 space-y-0.5">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-2.5 py-[6px] text-[13px] text-white/45 hover:text-white/80 transition-colors rounded-md hover:bg-white/8"
            >
              <LogOut size={14} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
