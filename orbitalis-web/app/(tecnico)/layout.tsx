'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import { CalendarDays, ClipboardList, LogOut } from 'lucide-react'
import { OfflineBanner } from '@/components/ui/offline-banner'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="min-h-screen bg-surface">
      {/* Header fixo no topo */}
      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] border-b border-[var(--nav-border)] px-4 py-2.5 flex items-center gap-3">
        <img src="/logo.png" alt="Orbitalis" className="h-8 w-auto object-contain" />
        <span className="text-sm text-gray-600">Portal do Técnico</span>
      </header>

      <OfflineBanner />

      {/* Conteúdo principal */}
      <main className="px-4 py-4 pb-20 max-w-xl mx-auto">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border flex safe-pb">
        <Link
          href="/minhas-os"
          className={[
            'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors',
            path.startsWith('/minhas-os') ? 'text-action' : 'text-gray-500 hover:text-gray-800',
          ].join(' ')}
        >
          <ClipboardList size={22} />
          Minhas O.S.
        </Link>
        <Link
          href="/minha-agenda"
          className={[
            'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors',
            path.startsWith('/minha-agenda') ? 'text-action' : 'text-gray-500 hover:text-gray-800',
          ].join(' ')}
        >
          <CalendarDays size={22} />
          Agenda
        </Link>
        <form action={logout} className="flex-1">
          <button
            type="submit"
            className="w-full h-full flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut size={22} />
            Sair
          </button>
        </form>
      </nav>
    </div>
  )
}
