'use client'

import { Printer } from 'lucide-react'

export function BotaoImprimir() {
  return (
    <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90">
      <Printer size={14} /> Imprimir
    </button>
  )
}
