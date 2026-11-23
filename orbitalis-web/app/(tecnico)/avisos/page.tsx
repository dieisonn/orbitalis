'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { carregarAvisos, sincronizarMarcador, EVENTO_AVISOS, type Aviso } from '@/components/ui/sino-avisos'

function quando(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  const ontem = new Date(hoje.getTime() - 86400000).toDateString() === d.toDateString()
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmoDia) return `Hoje, ${hora}`
  if (ontem) return `Ontem, ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`
}

export default function AvisosPage() {
  const router = useRouter()
  const [itens, setItens] = useState<Aviso[] | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    const d = await carregarAvisos()
    setItens(d?.itens ?? [])
    return d
  }, [])

  const marcar = useCallback(async (ids?: string[]) => {
    setOcupado(true)
    try {
      await fetch('/api/avisos', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) })
      const d = await carregarAvisos()
      if (d) { setItens(d.itens); sincronizarMarcador(d.naoLidos) }
      window.dispatchEvent(new Event(EVENTO_AVISOS))
    } finally { setOcupado(false) }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const naoLidos = (itens ?? []).filter((a) => !a.lidoEm).length

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Avisos</h1>
          <p className="text-xs text-gray-500">{naoLidos ? `${naoLidos} não lido${naoLidos > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
        </div>
        {naoLidos > 0 && (
          <button onClick={() => marcar()} disabled={ocupado} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 rounded-lg px-3 py-2 disabled:opacity-60">
            {ocupado ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />} Marcar todos como lidos
          </button>
        )}
      </div>

      {itens === null ? (
        <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <BellOff size={28} className="mx-auto mb-2" />
          <p className="text-sm">Nenhum aviso ainda.</p>
          <p className="text-xs mt-1">Novas O.S., mudanças e lembretes de eventos aparecem aqui.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => { if (!a.lidoEm) void marcar([a.id]); if (a.url) router.push(a.url) }}
                className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${a.lidoEm ? 'bg-white border-border' : 'bg-primary/5 border-primary/30'}`}
              >
                <div className="flex items-start gap-2">
                  {!a.lidoEm && <span className="mt-1.5 h-2 w-2 rounded-full bg-destructive shrink-0" aria-label="não lido" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm text-gray-900 truncate ${a.lidoEm ? 'font-medium' : 'font-bold'}`}>{a.titulo}</p>
                      <span className="text-[11px] text-gray-400 shrink-0">{quando(a.criadoEm)}</span>
                    </div>
                    <p className="text-[13px] text-gray-600 mt-0.5 whitespace-pre-line">{a.corpo}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
