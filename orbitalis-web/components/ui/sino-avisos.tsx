'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

type NavComBadge = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }

/** Atualiza o marcador no ícone do app (Android/iOS instalado) e some com os avisos já mostrados na bandeja. */
export function sincronizarMarcador(naoLidos: number) {
  try {
    const nav = navigator as NavComBadge
    if (naoLidos > 0) void nav.setAppBadge?.(naoLidos)
    else void nav.clearAppBadge?.()
  } catch { /* sem suporte */ }
  if (naoLidos === 0) {
    navigator.serviceWorker?.ready
      .then((reg) => reg.getNotifications().then((l) => l.forEach((n) => n.close())))
      .catch(() => null)
  }
}

export async function carregarAvisos(): Promise<{ itens: Aviso[]; naoLidos: number } | null> {
  try {
    const r = await fetch('/api/avisos', { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export type Aviso = { id: string; titulo: string; corpo: string; url: string | null; lidoEm: string | null; criadoEm: string }

export const EVENTO_AVISOS = 'orbitalis:avisos-lidos'

/** Sino do cabeçalho: mostra quantos avisos não foram vistos. */
export function SinoAvisos() {
  const [n, setN] = useState(0)
  const atualizar = useCallback(async () => {
    const d = await carregarAvisos()
    if (!d) return
    setN(d.naoLidos); sincronizarMarcador(d.naoLidos)
  }, [])

  useEffect(() => {
    void atualizar()
    const tick = () => { if (document.visibilityState === 'visible') void atualizar() }
    const id = window.setInterval(tick, 45_000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener(EVENTO_AVISOS, atualizar)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); window.removeEventListener(EVENTO_AVISOS, atualizar) }
  }, [atualizar])

  return (
    <Link href="/avisos" aria-label={n ? `${n} avisos não lidos` : 'Avisos'} className="ml-auto relative p-2 -mr-2 text-gray-700">
      <Bell size={22} />
      {n > 0 && (
        <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}
