'use client'

import { useEffect, useMemo, useState } from 'react'
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
  ReceiptText,
  TrendingUp,
  UserCircle,
  UsersRound,
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
      { href: '/agenda',                label: 'Agenda',            icon: CalendarDays },
      { href: '/ordens-servico',        label: 'Ordens de Serviço', icon: ClipboardList },
      { href: '/planos-manutencao',     label: 'Planos Prev.',      icon: CalendarClock },
    ],
  },
  {
    label: 'Comercial',
    defaultOpen: true,
    items: [
      { href: '/orcamentos', label: 'Orçamentos', icon: ReceiptText },
      { href: '/contratos',  label: 'Contratos',  icon: FileText },
    ],
  },
  {
    label: 'Cadastros',
    defaultOpen: true,
    items: [
      { href: '/clientes',    label: 'Clientes',    icon: Users },
      { href: '/ambientes',   label: 'Ambientes',   icon: Building2 },
      { href: '/equipamentos', label: 'Equipamentos', icon: Cpu },
      { href: '/usuarios',    label: 'Técnicos',    icon: UserCog },
      { href: '/equipe',      label: 'Equipe',      icon: UsersRound },
    ],
  },
  {
    label: 'Análise',
    defaultOpen: true,
    items: [
      { href: '/financeiro',                  label: 'Financeiro',     icon: TrendingUp },
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
      { href: '/perfil',        label: 'Meu Perfil',       icon: UserCircle },
    ],
  },
]

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

const EXACT_ROUTES = new Set([
  '/dashboard',
  '/agenda',
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
type UserInfo = { nome: string | null; email: string } | null

const STORAGE_KEY = 'orbitalis-nav-open'

export default function Sidebar({ config, alertasCount = 0, user }: { config?: Config; alertasCount?: number; user?: UserInfo }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // O grupo da página atual fica sempre aberto; os demais lembram a escolha da pessoa.
  const grupoAtual = useMemo(
    () => NAV_GROUPS.find((g) => g.items.some((i) => isActive(i.href, path)))?.label,
    [path],
  )
  const [abertos, setAbertos] = useState<Set<string>>(
    new Set(NAV_GROUPS.filter((g) => g.defaultOpen).map((g) => g.label)),
  )

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (Array.isArray(stored)) setAbertos(new Set(stored))
    } catch { /* mantém o padrão */ }
  }, [])

  function alternar(label: string) {
    setAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch { /* noop */ }
      return next
    })
  }

  const logoSrc = config?.logoUrl || '/logo.png'
  const nomeExibido = config?.nomeFantasia || config?.nomeEmpresa || 'Orbitalis'

  return (
    <>
      {/* Barra superior — celular */}
      <header className="fixed top-0 inset-x-0 z-40 h-12 md:hidden flex items-center gap-3 px-3 bg-[var(--nav-bg)] border-b border-[var(--nav-border)] print:hidden">
        <button
          className="p-2 -ml-1 text-gray-700 rounded-md hover:bg-white/70"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <img src={logoSrc} alt={nomeExibido} className="h-6 w-auto object-contain" />
        {alertasCount > 0 && (
          <Link href="/alertas" className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
            <Bell size={14} /> {alertasCount > 99 ? '99+' : alertasCount}
          </Link>
        )}
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={[
          'flex flex-col shrink-0 print:hidden h-full',
          'bg-[var(--nav-bg)] border-r border-[var(--nav-border)] text-gray-800',
          'fixed inset-y-0 left-0 z-50 w-64 md:static md:w-60 md:translate-x-0',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <div className="bg-white rounded-md px-2 py-1 flex items-center border border-[var(--nav-border)]">
            <img src={logoSrc} alt={nomeExibido} className="h-7 w-auto object-contain" />
          </div>
          <button
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-md"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 pb-3 shrink-0">
          <SearchButton />
        </div>

        {/* A navegação rola sozinha; o rodapé nunca some */}
        <nav className="flex-1 min-h-0 px-3 pb-3 overflow-y-auto" aria-label="Principal">
          {NAV_GROUPS.map((group, gi) => {
            const aberto = abertos.has(group.label) || group.label === grupoAtual
            return (
              <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
                <button
                  onClick={() => alternar(group.label)}
                  aria-expanded={aberto}
                  className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 select-none"
                >
                  {group.label}
                  <ChevronDown size={12} className={['transition-transform duration-150', aberto ? '' : '-rotate-90'].join(' ')} />
                </button>

                {aberto && (
                  <ul className="mt-0.5 space-y-px">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const ativo = isActive(href, path)
                      const ehAlertas = href === '/alertas'
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setOpen(false)}
                            aria-current={ativo ? 'page' : undefined}
                            className={[
                              'relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-md text-[13.5px] transition-colors',
                              ativo
                                ? 'bg-white text-primary font-semibold shadow-[0_0_0_1px_var(--nav-border)]'
                                : 'text-gray-700 hover:bg-white/60 hover:text-gray-900',
                            ].join(' ')}
                          >
                            {ativo && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-action" />}
                            <Icon size={15} className="shrink-0" />
                            <span className="flex-1 truncate">{label}</span>
                            {ehAlertas && alertasCount > 0 && (
                              <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-white text-xs font-semibold px-1.5">
                                {alertasCount > 99 ? '99+' : alertasCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[var(--nav-border)] shrink-0">
          {user && (
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/70 transition-colors"
            >
              <span className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {(user.nome ?? user.email).charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-gray-900 truncate leading-tight">{user.nome ?? user.email}</span>
                {user.nome && <span className="block text-xs text-gray-500 truncate leading-tight">{user.email}</span>}
              </span>
            </Link>
          )}
          <div className="mt-1 grid grid-cols-2 gap-1">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors rounded-md"
              >
                <LogOut size={14} />
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
