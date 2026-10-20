'use client'

import { useEffect } from 'react'

/**
 * Texto cortado com "…" ganha o conteúdo completo como dica ao passar o mouse.
 * Uma única escuta no documento: vale para qualquer elemento com a classe `truncate`.
 */
export function TruncateTitles() {
  useEffect(() => {
    function ao(e: MouseEvent) {
      const alvo = (e.target as HTMLElement | null)?.closest?.('.truncate') as HTMLElement | null
      if (!alvo || alvo.title) return
      if (alvo.scrollWidth > alvo.clientWidth + 1) alvo.title = alvo.textContent?.trim() ?? ''
    }
    document.addEventListener('mouseover', ao)
    return () => document.removeEventListener('mouseover', ao)
  }, [])
  return null
}
