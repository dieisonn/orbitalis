'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MapPin, Map as MapaIcone, X, Loader2 } from 'lucide-react'
import { mapaUrl } from '@/lib/agenda'

/**
 * Campo de endereço com sugestões enquanto digita e mapa dentro da própria tela (sem abrir outra aba).
 * O mapa mostra o que está escrito no campo; ao escolher uma sugestão ele abre sozinho.
 */
export function EnderecoInput({ value, onChange, className = '', placeholder = 'Endereço onde o serviço será executado', ariaLabel = 'Local', cidade, uf }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; ariaLabel?: string
  cidade?: string | null; uf?: string | null   // cidade da empresa: as sugestões dela vêm primeiro
}) {
  const uid = useId()
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const [buscando, setBuscando] = useState(false)
  const [mapa, setMapa] = useState(false)
  const [mapaTexto, setMapaTexto] = useState('')   // o que o mapa mostra (atualiza ao parar de digitar)
  const digitado = useRef(false)                   // só busca sugestões quando a pessoa digitou (não ao preencher sozinho)

  useEffect(() => {
    if (!digitado.current) return
    const q = value.trim()
    if (q.length < 4) return
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await fetch(`/api/enderecos?q=${encodeURIComponent(q)}&cidade=${encodeURIComponent(cidade ?? '')}&uf=${encodeURIComponent(uf ?? '')}`, { signal: ctl.signal })
        const lista: { rotulo: string }[] = r.ok ? await r.json() : []
        setSugestoes(lista.map((l) => l.rotulo)); setAtivo(-1)
      } catch { /* cancelado ou sem rede */ } finally { if (!ctl.signal.aborted) setBuscando(false) }
    }, 400)
    return () => { clearTimeout(t); ctl.abort() }
  }, [value, cidade, uf])

  useEffect(() => {
    if (!mapa) return
    const t = setTimeout(() => setMapaTexto(value.trim()), 600)
    return () => clearTimeout(t)
  }, [value, mapa])

  function escolher(s: string) {
    digitado.current = false
    onChange(s); setAberto(false); setSugestoes([]); setMapaTexto(s); setMapa(true)
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (!aberto || !sugestoes.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(sugestoes.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); escolher(sugestoes[ativo]) }
    else if (e.key === 'Escape') { e.stopPropagation(); setAberto(false) }
  }

  const texto = value.trim()
  return (
    <div onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAberto(false) }}>
      <div className="relative">
        <input value={value} className={className} aria-label={ariaLabel} placeholder={placeholder}
          role="combobox" aria-expanded={aberto && sugestoes.length > 0} aria-controls={`${uid}-lista`} aria-autocomplete="list"
          aria-activedescendant={ativo >= 0 ? `${uid}-op-${ativo}` : undefined} autoComplete="off"
          onChange={(e) => { digitado.current = true; onChange(e.target.value); setAberto(true) }}
          onFocus={() => setAberto(true)} onKeyDown={aoTeclar} />
        {buscando && <Loader2 size={14} aria-label="Buscando endereços" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />}
        {aberto && sugestoes.length > 0 && (
          <ul id={`${uid}-lista`} role="listbox" aria-label="Endereços sugeridos"
            className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
            {sugestoes.map((s, i) => (
              <li key={s} id={`${uid}-op-${i}`} role="option" aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(s)} onMouseMove={() => setAtivo(i)}
                className={`flex items-start gap-2 px-3 py-2 text-sm cursor-pointer text-gray-900 ${i === ativo ? 'bg-gray-100' : ''}`}>
                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {texto && (
        <div className="mt-1.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setMapaTexto(texto); setMapa((m) => !m) }} aria-expanded={mapa}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-action hover:underline">
              {mapa ? <X size={11} /> : <MapaIcone size={11} />} {mapa ? 'Fechar mapa' : 'Ver no mapa'}
            </button>
            {mapa && (
              <a href={mapaUrl(texto)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:underline">
                Abrir no Google Maps
              </a>
            )}
          </div>
          {mapa && mapaTexto && (
            <iframe title="Mapa do local" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapaTexto)}&hl=pt-BR&z=16&output=embed`}
              className="mt-1.5 w-full h-52 rounded-lg border border-border bg-surface" />
          )}
        </div>
      )}
    </div>
  )
}
