'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const INTERVALO_MS = 30_000
const LIMITE_PUXAR = 70

/** Páginas de lista do portal: atualizam sozinhas e aceitam "puxar para atualizar". A tela de execução da O.S. fica de fora (não perder o que está sendo preenchido). */
function ehLista(path: string) {
  return path === '/minhas-os' || path === '/minha-agenda' || path.startsWith('/minha-agenda/')
}

export function AtualizadorPortal() {
  const router = useRouter()
  const path = usePathname()
  const ativo = ehLista(path)
  const [puxada, setPuxada] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const inicioY = useRef<number | null>(null)
  const puxadaRef = useRef(0)

  const atualizar = useCallback(() => {
    setAtualizando(true)
    router.refresh()
    window.setTimeout(() => setAtualizando(false), 900)
  }, [router])

  // Atualização automática: a cada 30 s com a tela visível e ao voltar para o app / recuperar conexão.
  useEffect(() => {
    if (!ativo) return
    const visivel = () => document.visibilityState === 'visible' && navigator.onLine
    const tick = () => { if (visivel()) router.refresh() }
    const id = window.setInterval(tick, INTERVALO_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('online', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('online', tick)
    }
  }, [ativo, router])

  // Puxar para atualizar (o do navegador não funciona no app instalado).
  useEffect(() => {
    if (!ativo) return
    const onStart = (e: TouchEvent) => {
      inicioY.current = window.scrollY <= 0 ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (inicioY.current === null) return
      const d = e.touches[0].clientY - inicioY.current
      if (d <= 0) { puxadaRef.current = 0; setPuxada(0); return }
      puxadaRef.current = Math.min(d * 0.5, 110)
      setPuxada(puxadaRef.current)
    }
    const onEnd = () => {
      if (inicioY.current !== null && puxadaRef.current >= LIMITE_PUXAR * 0.5) atualizar()
      inicioY.current = null; puxadaRef.current = 0; setPuxada(0)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [ativo, atualizar])

  if (!ativo || (puxada === 0 && !atualizando)) return null
  const altura = atualizando ? 44 : puxada
  return (
    <div className="fixed left-0 right-0 top-12 z-30 flex justify-center pointer-events-none" style={{ height: altura }} aria-live="polite">
      <div className="mt-1 h-9 w-9 rounded-full bg-white shadow border border-border flex items-center justify-center text-primary">
        <RefreshCw size={18} className={atualizando ? 'animate-spin' : ''} style={atualizando ? undefined : { transform: `rotate(${puxada * 3}deg)` }} />
      </div>
    </div>
  )
}
