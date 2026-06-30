'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ClipboardList, Cpu, Building2, X, Loader2 } from 'lucide-react'

type ResultItem = { id: string; label: string; sublabel: string; href: string; tipo: string }
type Results = { clientes: ResultItem[]; ordens: ResultItem[]; equipamentos: ResultItem[]; ambientes: ResultItem[] }

const TIPO_ICON: Record<string, React.ElementType> = {
  cliente: Users,
  ordem: ClipboardList,
  equipamento: Cpu,
  ambiente: Building2,
}
const TIPO_LABEL: Record<string, string> = {
  cliente: 'Clientes',
  ordem: 'Ordens de Serviço',
  equipamento: 'Equipamentos',
  ambiente: 'Ambientes',
}

function grupo(titulo: string, items: ResultItem[], onNavigate: (href: string) => void, activeIdx: number, offset: number) {
  if (items.length === 0) return null
  const Icon = TIPO_ICON[items[0].tipo] ?? Search
  return (
    <div>
      <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{titulo}</p>
      {items.map((item, i) => {
        const globalIdx = offset + i
        return (
          <button
            key={item.id}
            data-idx={globalIdx}
            onMouseDown={(e) => { e.preventDefault(); onNavigate(item.href) }}
            className={[
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
              globalIdx === activeIdx ? 'bg-primary/8' : 'hover:bg-gray-50',
            ].join(' ')}
          >
            <Icon size={14} className="shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
              <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

async function fetchBusca(q: string): Promise<Results> {
  const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
  if (!res.ok) return { clientes: [], ordens: [], equipamentos: [], ambientes: [] }
  return res.json()
}

export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Atalho Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) { setQ(''); setResults(null); setActiveIdx(-1); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const data = await fetchBusca(q.trim())
        setResults(data)
        setActiveIdx(-1)
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const allItems = results
    ? [...results.clientes, ...results.ordens, ...results.equipamentos, ...results.ambientes]
    : []

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0 && allItems[activeIdx]) { navigate(allItems[activeIdx].href) }
  }

  const total = allItems.length
  const hasResults = results && total > 0
  const noResults = results && total === 0 && q.trim().length >= 2

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Painel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {isPending
            ? <Loader2 size={16} className="text-primary shrink-0 animate-spin" />
            : <Search size={16} className="text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pesquisar clientes, O.S., equipamentos…"
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          {q && (
            <button onClick={() => { setQ(''); setResults(null) }} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:block text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        {/* Resultados */}
        {(hasResults || noResults) && (
          <div className="max-h-[420px] overflow-y-auto py-1">
            {noResults && (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">Nenhum resultado para "{q}"</p>
            )}
            {hasResults && results && (() => {
              let offset = 0
              const secoes = [
                { titulo: TIPO_LABEL.cliente,     items: results.clientes },
                { titulo: TIPO_LABEL.ordem,       items: results.ordens },
                { titulo: TIPO_LABEL.equipamento, items: results.equipamentos },
                { titulo: TIPO_LABEL.ambiente,    items: results.ambientes },
              ]
              return secoes.map(({ titulo, items }) => {
                const el = grupo(titulo, items, navigate, activeIdx, offset)
                offset += items.length
                return el
              })
            })()}
          </div>
        )}

        {/* Dica de atalhos */}
        {!hasResults && !noResults && (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-gray-400">Digite 2+ caracteres para pesquisar</p>
            <p className="text-[10px] text-gray-300 mt-1">↑↓ navegar · Enter selecionar · Esc fechar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Botão que abre a paleta
export function SearchButton() {
  function handleClick() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
    >
      <Search size={13} />
      <span className="hidden sm:block">Pesquisar</span>
      <kbd className="hidden sm:block font-mono text-white/30">⌘K</kbd>
    </button>
  )
}
