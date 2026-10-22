'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, BellRing, X, Loader2 } from 'lucide-react'
import { hhmm, type EventoAgenda } from '@/lib/agenda'

// Avisos de eventos próximos: a pessoa escolhe até 3 antecedências (10/20/30/40/50 min; padrão 30).
// Enquanto o Orbitalis estiver aberto, a página consulta a agenda a cada 30 s e avisa na tela
// (e pelo navegador, se a pessoa permitir). Não há aviso com o sistema fechado.

export const OPCOES_AVISO = [10, 20, 30, 40, 50] as const
const PADRAO = [30]
const EVENTO_MUDOU = 'orbitalis:avisos-agenda'
const CHAVE_FEITOS = 'orbitalis_avisos_feitos'
const INTERVALO_MS = 30_000
const proxy = (path: string) => `/api/agenda-proxy?path=${encodeURIComponent(path)}`

type Toast = { id: string; titulo: string; quando: string; detalhe: string | null }

function lerFeitos(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CHAVE_FEITOS) ?? '{}') } catch { return {} }
}
function gravarFeitos(f: Record<string, number>) {
  try {
    const corte = Date.now() - 6 * 3600_000
    for (const k of Object.keys(f)) if (f[k] < corte) delete f[k]
    localStorage.setItem(CHAVE_FEITOS, JSON.stringify(f))
  } catch { /* sem armazenamento: pode repetir o aviso, sem prejuízo */ }
}

export function AvisosAgendaNotificador() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const minutosRef = useRef<number[]>(PADRAO)

  useEffect(() => {
    let ativo = true
    const fechar = (id: string) => setToasts((t) => t.filter((x) => x.id !== id))

    async function carregarPrefs() {
      try {
        const r = await fetch(proxy('/agenda/avisos'), { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json()
        if (ativo && Array.isArray(d?.minutos)) minutosRef.current = [...d.minutos].sort((a: number, b: number) => a - b)
      } catch { /* mantém o que já tinha */ }
    }

    async function verificar() {
      const prefs = minutosRef.current
      if (!prefs.length) return
      const agora = Date.now()
      const maior = Math.max(...prefs)
      try {
        const q = `/agenda?inicio=${encodeURIComponent(new Date(agora).toISOString())}&fim=${encodeURIComponent(new Date(agora + (maior + 2) * 60_000).toISOString())}`
        const r = await fetch(proxy(q), { cache: 'no-store' })
        if (!r.ok) return
        const eventos: EventoAgenda[] = await r.json()
        const feitos = lerFeitos()
        const novos: Toast[] = []
        for (const e of eventos) {
          if (e.diaInteiro) continue
          const st = e.ordemServico?.status
          if (st === 'concluida' || st === 'cancelada') continue
          const falta = (new Date(e.inicio).getTime() - agora) / 60_000
          if (falta <= 0) continue
          // avisos "vencidos" = antecedência >= tempo que falta; avisa pelo mais próximo e dá os demais por feitos
          const vencidos = prefs.filter((m) => m >= falta)
          if (!vencidos.length) continue
          const chaveMenor = `${e.id}|${e.inicio}|${vencidos[0]}`
          if (feitos[chaveMenor]) continue
          for (const m of vencidos) feitos[`${e.id}|${e.inicio}|${m}`] = agora
          const min = Math.max(1, Math.ceil(falta))
          novos.push({
            id: `${e.id}|${e.inicio}|${vencidos[0]}`,
            titulo: e.titulo,
            quando: `Começa às ${hhmm(e.inicio)} — em ${min} min`,
            detalhe: [e.cliente?.nome, e.local].filter(Boolean).join(' · ') || null,
          })
        }
        gravarFeitos(feitos)
        if (!ativo || !novos.length) return
        setToasts((t) => [...t, ...novos.filter((n) => !t.some((x) => x.id === n.id))])
        for (const n of novos) {
          setTimeout(() => fechar(n.id), 90_000)
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(n.titulo, { body: `${n.quando}${n.detalhe ? `\n${n.detalhe}` : ''}`, tag: n.id })
            }
          } catch { /* navegador sem suporte */ }
        }
      } catch { /* offline ou API indisponível: tenta de novo no próximo ciclo */ }
    }

    const aoMudar = () => { carregarPrefs().then(verificar) }
    window.addEventListener(EVENTO_MUDOU, aoMudar)
    carregarPrefs().then(verificar)
    const timer = setInterval(verificar, INTERVALO_MS)
    return () => { ativo = false; clearInterval(timer); window.removeEventListener(EVENTO_MUDOU, aoMudar) }
  }, [])

  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] print:hidden" role="region" aria-label="Avisos da agenda">
      {toasts.map((t) => (
        <div key={t.id} role="status" aria-live="polite"
          className="bg-white border border-border border-l-4 border-l-action rounded-lg shadow-lg p-3 flex gap-2.5">
          <BellRing size={18} className="text-action shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{t.titulo}</p>
            <p className="text-xs text-gray-700">{t.quando}</p>
            {t.detalhe && <p className="text-xs text-gray-600 truncate">{t.detalhe}</p>}
            <Link href="/agenda" className="text-xs font-semibold text-primary hover:underline">Abrir agenda</Link>
          </div>
          <button onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))} aria-label="Dispensar aviso"
            className="self-start p-1 text-gray-500 hover:text-gray-800"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

export function AvisosAgendaBotao() {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button onClick={() => setAberto(true)} title="Avisos de eventos próximos"
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-sm font-semibold text-gray-700 rounded-lg bg-white hover:bg-surface">
        <Bell size={14} aria-hidden="true" /> Avisos
      </button>
      {aberto && <AvisosModal onFechar={() => setAberto(false)} />}
    </>
  )
}

function AvisosModal({ onFechar }: { onFechar: () => void }) {
  const [sel, setSel] = useState<number[] | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission))

  useEffect(() => {
    let ativo = true
    fetch(proxy('/agenda/avisos'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (ativo) setSel(Array.isArray(d?.minutos) ? d.minutos : PADRAO) })
      .catch(() => { if (ativo) setSel(PADRAO) })
    return () => { ativo = false }
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const alternar = (m: number) => {
    setMsg(null)
    setSel((atual) => {
      const l = atual ?? []
      if (l.includes(m)) return l.filter((x) => x !== m)
      if (l.length >= 3) { setMsg({ tipo: 'erro', texto: 'No máximo 3 avisos. Desmarque um para escolher outro.' }); return l }
      return [...l, m]
    })
  }

  const salvar = useCallback(async () => {
    if (!sel) return
    setSalvando(true); setMsg(null)
    try {
      const r = await fetch(proxy('/agenda/avisos'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutos: sel }),
      })
      if (!r.ok) throw new Error()
      window.dispatchEvent(new Event(EVENTO_MUDOU))
      setMsg({ tipo: 'ok', texto: 'Avisos salvos.' })
    } catch {
      setMsg({ tipo: 'erro', texto: 'Não foi possível salvar. Tente novamente.' })
    } finally { setSalvando(false) }
  }, [sel])

  async function pedirPermissao() {
    try { setPerm(await Notification.requestPermission()) } catch { /* ignora */ }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="avisos-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 id="avisos-titulo" className="text-base font-bold text-gray-900">Avisos de eventos próximos</h2>
          <button onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-4">Escolha até 3 momentos para ser avisado antes de cada evento começar. Padrão: 30 minutos.</p>
        {sel === null ? (
          <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-gray-500" size={20} aria-label="Carregando" /></div>
        ) : (
          <fieldset>
            <legend className="sr-only">Minutos de antecedência</legend>
            <div className="flex flex-wrap gap-2">
              {OPCOES_AVISO.map((m) => {
                const on = sel.includes(m)
                return (
                  <label key={m} className={`cursor-pointer select-none px-3 py-2 rounded-lg border text-sm font-semibold ${on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border hover:bg-surface'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => alternar(m)} />
                    {m} min antes
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">{sel.length === 0 ? 'Nenhum aviso: você não será notificado.' : `${sel.length} de 3 escolhidos.`}</p>
          </fieldset>
        )}
        <div className="mt-4 text-xs text-gray-700 bg-surface rounded-lg p-3">
          {perm === 'granted' && <p>Notificações do navegador ativas. Os avisos também aparecem na tela.</p>}
          {perm === 'default' && (
            <p>Os avisos aparecem na tela com o Orbitalis aberto. <button onClick={pedirPermissao} className="font-semibold text-primary hover:underline">Ativar também notificações do navegador</button></p>
          )}
          {perm === 'denied' && <p>As notificações do navegador estão bloqueadas neste navegador; os avisos aparecem só na tela.</p>}
          {perm === 'indisponivel' && <p>Este navegador não oferece notificações do sistema; os avisos aparecem na tela.</p>}
          <p className="mt-1">Os avisos funcionam enquanto o Orbitalis estiver aberto em alguma aba.</p>
        </div>
        {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`mt-3 text-sm ${msg.tipo === 'erro' ? 'text-red-700' : 'text-green-800'}`}>{msg.texto}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Fechar</button>
          <button onClick={salvar} disabled={salvando || sel === null}
            className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
