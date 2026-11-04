'use client'

import { useState } from 'react'
import { FREQUENCIAS_PADRAO } from '@/lib/frequencia'

const PERSONALIZADO = 'personalizado'
const selectCls = 'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white'

/** Frequência do plano: opções prontas + "Personalizado" (a cada N meses ou dias). Envia `frequenciaDias` no formulário. */
export function CampoFrequencia({ valorInicial = 30, onChange }: { valorInicial?: number; onChange?: (dias: number) => void }) {
  const ehPadrao = FREQUENCIAS_PADRAO.some((f) => f.value === valorInicial)
  const [modo, setModo] = useState<string>(ehPadrao ? String(valorInicial) : PERSONALIZADO)
  const [unidade, setUnidade] = useState<'meses' | 'dias'>(!ehPadrao && valorInicial % 30 !== 0 ? 'dias' : 'meses')
  const [qtd, setQtd] = useState<string>(
    ehPadrao ? '' : String(valorInicial % 30 === 0 ? valorInicial / 30 : valorInicial),
  )

  const personalizado = modo === PERSONALIZADO
  const n = Number(qtd)
  const dias = personalizado ? (Number.isInteger(n) && n >= 1 ? n * (unidade === 'meses' ? 30 : 1) : 0) : Number(modo)

  function emitir(d: number) { if (d >= 1) onChange?.(d) }

  return (
    <div className="space-y-2">
      <select
        value={modo}
        onChange={(e) => {
          const m = e.target.value
          setModo(m)
          if (m === PERSONALIZADO) emitir(Number(qtd) >= 1 ? Number(qtd) * (unidade === 'meses' ? 30 : 1) : 0)
          else emitir(Number(m))
        }}
        className={selectCls}
      >
        {FREQUENCIAS_PADRAO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        <option value={PERSONALIZADO}>Personalizado…</option>
      </select>

      {personalizado && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">A cada</span>
          <input
            type="number" min={1} max={unidade === 'meses' ? 60 : 1800} step={1} required
            value={qtd}
            onChange={(e) => { setQtd(e.target.value); const v = Number(e.target.value); if (Number.isInteger(v) && v >= 1) emitir(v * (unidade === 'meses' ? 30 : 1)) }}
            className="w-24 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="4"
          />
          <select
            value={unidade}
            onChange={(e) => { const u = e.target.value as 'meses' | 'dias'; setUnidade(u); emitir(Number(qtd) >= 1 ? Number(qtd) * (u === 'meses' ? 30 : 1) : 0) }}
            className="px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="meses">meses</option>
            <option value="dias">dias</option>
          </select>
        </div>
      )}
      <input type="hidden" name="frequenciaDias" value={dias || ''} required />
    </div>
  )
}
