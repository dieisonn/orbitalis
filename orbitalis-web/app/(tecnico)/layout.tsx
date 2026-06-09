'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import { ClipboardList, LogOut, Menu, X } from 'lucide-react'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Hamburger — mobile only */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-primary text-white rounded-lg shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
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
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="bg-white rounded-3xl p-3 inline-flex items-center">
              <img
                src="/logo.png"
                alt="Orbitalis"
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-[10px] text-white/50 mt-1.5 uppercase tracking-widest">
              Portal do Técnico
            </p>
          </div>
          <button
            className="md:hidden p-1 text-white/60 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4">
          <Link
            href="/minhas-os"
            onClick={() => setOpen(false)}
            className={[
              'flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors',
              path.startsWith('/minhas-os')
                ? 'bg-white/15 text-white'
                : 'text-white/65 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            <ClipboardList size={16} />
            Minhas O.S.
          </Link>
        </nav>

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

      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">{children}</main>
    </div>
  )
}
