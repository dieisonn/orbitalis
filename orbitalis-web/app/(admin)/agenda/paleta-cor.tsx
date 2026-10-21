'use client'

import { useEffect, useRef } from 'react'
import { Check, Pencil } from 'lucide-react'
import { PALETA } from '@/lib/agenda'
import { textoSobre } from '@/lib/cor'

const igual = (a: string | null, b: string) => !!a && a.toLowerCase() === b.toLowerCase()

/** Seletor de cor do evento: 24 cores, cor livre (lápis) e "Padrão" (a cor do tipo de serviço). */
export function PaletaCor({ atual, padrao, onEscolher }: {
  atual: string | null            // null = padrão
  padrao: string                  // cor que vale quando não há personalização
  onEscolher: (hex: string | null) => void
}) {
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (espera.current) clearTimeout(espera.current) }, [])
  const livre = !!atual && !PALETA.some((h) => igual(atual, h))

  return (
    <div>
      <div className="grid grid-cols-9 gap-1.5" role="group" aria-label="Cor do evento">
        {PALETA.map((hex) => {
          const sel = igual(atual, hex)
          return (
            <button key={hex} type="button" onClick={() => onEscolher(hex)} aria-pressed={sel} aria-label={`Cor ${hex}`}
              style={{ backgroundColor: hex }}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform focus-visible:outline-2">
              {sel && <Check size={14} strokeWidth={3} style={{ color: textoSobre(hex) }} />}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <label title="Escolher outra cor"
          className="relative w-8 h-8 shrink-0 rounded-full border border-border bg-white flex items-center justify-center text-gray-600 hover:bg-surface cursor-pointer"
          style={livre ? { backgroundColor: atual! } : undefined}>
          {livre ? <Check size={14} strokeWidth={3} style={{ color: textoSobre(atual!) }} /> : <Pencil size={14} />}
          <input type="color" aria-label="Cor personalizada" value={atual ?? padrao}
            onChange={(e) => {
              const v = e.target.value
              if (espera.current) clearTimeout(espera.current)
              espera.current = setTimeout(() => onEscolher(v), 350)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>
        <button type="button" onClick={() => onEscolher(null)} aria-pressed={atual === null}
          className="flex-1 flex items-center justify-center gap-2 h-8 rounded-md bg-surface border border-border text-sm font-medium text-gray-700 hover:bg-gray-200">
          <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: padrao }}>
            {atual === null && <Check size={11} strokeWidth={3} style={{ color: textoSobre(padrao) }} />}
          </span>
          Padrão
        </button>
      </div>
    </div>
  )
}
