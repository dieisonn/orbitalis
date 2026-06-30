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
  Settings,
  Bell,
  FileText,
  BarChart2,
  FileSpreadsheet,
  CalendarDays,
  Briefcase,
  ShieldCheck,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SearchButton } from '@/components/ui/search-palette'

const NAV_GROUPS = [
  {
    label: 'VISÃO GERAL',
    items: [
      { href: '/dashboard',             label: 'Cockpit',           icon: LayoutDashboard },
      { href: '/alertas',               label: 'Alertas',           icon: Bell },
      { href: '/ordens-servico/agenda', label: 'Agenda',            icon: CalendarDays },
    ],
  },
  {
    label: 'CLIENTES',
    items: [
      { href: '/clientes',              label: 'Clientes',          icon: Users },
      { href: '/contratos',             label: 'Contratos',         icon: FileText },
    ],
  },
  {
    label: 'INFRAESTRUTURA',
    items: [
      { href: '/ambientes',                   label: 'Ambientes',       icon: Building2 },
      { href: '/equipamentos',                label: 'Equipamentos',    icon: Cpu },
      { href: '/equipamentos/confiabilidade', label: 'Confiabilidade',  icon: ShieldCheck },
    ],
  },
  {
    label: 'MANUTENÇÃO',
    items: [
      { href: '/ordens-servico',    label: 'Ordens de Serviço', icon: ClipboardList },
      { href: '/planos-manutencao', label: 'Planos Prev.',      icon: CalendarClock },
      { href: '/checklists',        label: 'Checklists',        icon: ClipboardCheck },
    ],
  },
  {
    label: 'EQUIPE',
    items: [
      { href: '/usuarios',               label: 'Técnicos',      icon: UserCog },
      { href: '/tecnicos/produtividade', label: 'Produtividade', icon: BarChart2 },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { href: '/servicos',     label: 'Tipos de Serviço', icon: Briefcase },
      { href: '/configuracoes', label: 'Configurações',   icon: Settings },
    ],
  },
]

// Todas as hrefs para resolução de conflito de activeState
const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

// Rotas que só ficam ativas em match exato (não ativam por prefixo)
const EXACT_ROUTES = new Set([
  '/dashboard',
  '/ordens-servico/agenda',
  '/equipamentos/confiabilidade',
])

function isActive(href: string, path: string): boolean {
  if (path === href) return true
  if (EXACT_ROUTES.has(href)) return false
  if (!path.startsWith(href + '/')) return false
  // Evita que /equipamentos fique ativo quando em /equipamentos/confiabilidade
  const moreSpecific = ALL_HREFS.find((h) => h !== href && h.startsWith(href + '/') && path.startsWith(h))
  return !moreSpecific
}

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null } | null

export default function Sidebar({ config, alertasCount = 0 }: { config?: Config; alertasCount?: number }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  const logoSrc     = config?.logoUrl || '/logo.png'
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
          'fixed inset-y-0 left-0 z-50 w-60 md:w-52',
          'md:static md:translate-x-0',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="bg-white/95 rounded-xl px-3 py-2 flex items-center">
            <img src={logoSrc} alt={nomeExibido} className="h-12 w-auto object-contain" />
          </div>
          <button
            className="md:hidden p-1 text-white/50 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Busca */}
        <div className="px-3 py-2 border-b border-white/10">
          <SearchButton />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
              {/* Separador + rótulo do grupo */}
              {gi > 0 && <div className="mx-4 my-1 border-t border-white/8" />}
              <p className="px-5 pt-2 pb-1 text-[9px] font-bold tracking-widest text-white/30 uppercase select-none">
                {group.label}
              </p>

              {group.items.map(({ href, label, icon: Icon }) => {
                const active   = isActive(href, path)
                const isAlertas = href === '/alertas'
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={[
                      'flex items-center gap-3 px-5 py-2 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-white/12 text-white'
                        : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                    ].join(' ')}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isAlertas && alertasCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {alertasCount > 99 ? '99+' : alertasCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Tema + Logout */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/8"
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
