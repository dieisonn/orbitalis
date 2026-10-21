'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

const CHAVE = 'orbitalis-cookies-ok'

// Aviso informativo: o sistema usa só cookies essenciais (login e preferências), sem rastreamento.
export function AvisoCookies() {
  const [fechado, setFechado] = useState(false)
  // No servidor nada aparece; no navegador lê o armazenamento (sem setState em efeito).
  const jaViu = useSyncExternalStore(
    () => () => {},
    () => { try { return !!localStorage.getItem(CHAVE) } catch { return false } },
    () => true,
  )

  if (jaViu || fechado) return null

  function fechar() {
    try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento: some só nesta visita */ }
    setFechado(true)
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="print:hidden fixed z-[60] bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm bg-white text-gray-700 border border-border rounded-lg shadow-lg p-4 text-sm"
    >
      <p>
        Usamos apenas cookies essenciais, para manter você conectado e lembrar suas preferências. Não usamos rastreamento nem publicidade.{' '}
        <Link href="/privacidade#cookies" className="text-action underline">Saiba mais</Link>
      </p>
      <button
        type="button"
        onClick={fechar}
        className="mt-3 px-4 py-1.5 bg-action text-white text-sm font-semibold rounded-md hover:bg-action/90"
      >
        Entendi
      </button>
    </div>
  )
}
