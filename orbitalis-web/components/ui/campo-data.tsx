'use client'

import { useId, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { br2iso, diaDaSemanaISO, iso2br } from '@/lib/datas'

export type AtalhoData = { rotulo: string; iso: string }

const mascara = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

/**
 * Campo de data: digite só os números (05112026 → 05/11/2026), escolha no calendário ou use um atalho.
 * Mostra o dia da semana. Envia AAAA-MM-DD (campo `name`) e avisa o pai por `onChange`.
 */
export function CampoData({ value, defaultValue = '', onChange, name, min, max, required, atalhos = [], id, ariaLabel }: {
  value?: string; defaultValue?: string; onChange?: (iso: string) => void
  name?: string; min?: string; max?: string; required?: boolean; atalhos?: AtalhoData[]; id?: string; ariaLabel?: string
}) {
  const uid = useId()
  const [interno, setInterno] = useState(defaultValue)
  const iso = value ?? interno
  const [texto, setTexto] = useState(iso2br(iso))
  const [ultimoIso, setUltimoIso] = useState(iso)
  const nativo = useRef<HTMLInputElement>(null)

  // valor mudou por fora (atalho, calendário, formulário): atualiza o texto
  if (iso !== ultimoIso) { setUltimoIso(iso); setTexto(iso2br(iso)) }

  function definir(novo: string, digitado = false) {
    if (value === undefined) setInterno(novo)
    if (digitado) setUltimoIso(novo)   // o texto já é o que a pessoa digitou: não reescrever
    onChange?.(novo)
  }

  const completo = texto.length === 10
  const valido = completo ? br2iso(texto) : ''
  let erro = ''
  if (completo && !valido) erro = 'Data inexistente.'
  else if (valido && min && valido < min) erro = `Use ${iso2br(min)} ou depois.`
  else if (valido && max && valido > max) erro = `Use até ${iso2br(max)}.`

  const descricaoId = `${uid}-desc`
  return (
    <div>
      {name && <input type="hidden" name={name} value={iso} />}
      {required && <input tabIndex={-1} aria-hidden="true" required value={iso} onChange={() => {}} className="sr-only" />}
      <div className="relative">
        <input
          id={id} inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" aria-label={ariaLabel}
          aria-invalid={!!erro} aria-describedby={descricaoId} value={texto}
          onChange={(e) => {
            const t = mascara(e.target.value); setTexto(t)
            const v = br2iso(t); definir(t.length === 10 && v && (!min || v >= min) && (!max || v <= max) ? v : '', true)
          }}
          className={`w-full pl-4 pr-11 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 ${erro ? 'border-destructive' : 'border-border'}`}
        />
        <button type="button" aria-label="Abrir calendário" onClick={() => { try { nativo.current?.showPicker() } catch { nativo.current?.focus() } }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-600 hover:bg-surface hover:text-primary">
          <CalendarDays size={16} />
        </button>
        {/* seletor nativo só para abrir o calendário do navegador */}
        <input ref={nativo} type="date" tabIndex={-1} aria-hidden="true" min={min} max={max} value={iso}
          onChange={(e) => { if (e.target.value) { definir(e.target.value); setTexto(iso2br(e.target.value)) } }}
          className="absolute right-2 bottom-0 w-0 h-0 opacity-0 pointer-events-none" />
      </div>
      <p id={descricaoId} className={`text-xs mt-1 ${erro ? 'text-destructive' : 'text-gray-600'}`} aria-live="polite">
        {erro || (valido ? diaDaSemanaISO(valido) : 'Digite a data ou escolha no calendário.')}
      </p>
      {atalhos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {atalhos.map((a) => (
            <button key={a.rotulo} type="button" onClick={() => definir(a.iso)}
              className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${iso === a.iso ? 'bg-primary text-white border-primary' : 'border-border text-gray-700 bg-white hover:bg-surface'}`}>
              {a.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
