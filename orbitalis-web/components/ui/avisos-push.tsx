'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const paraUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Botão "Ativar avisos": registra este aparelho para receber O.S. novas, mudanças e cancelamentos. */
export function AvisosPush() {
  const [estado, setEstado] = useState<'carregando' | 'indisponivel' | 'inativo' | 'ativo' | 'bloqueado'>('carregando')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setEstado('indisponivel'); return }
    if (Notification.permission === 'denied') { setEstado('bloqueado'); return }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setEstado(sub && Notification.permission === 'granted' ? 'ativo' : 'inativo')
    }).catch(() => setEstado('indisponivel'))
  }, [])

  async function ativar() {
    setOcupado(true); setMsg(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'bloqueado' : 'inativo'); return }
      const { chave } = await (await fetch('/api/push')).json()
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: paraUint8(chave) })
      const j = sub.toJSON()
      // só endpoint e chaves: a API recusa campos extras (como expirationTime)
      const r = await fetch('/api/push', { method: 'POST', body: JSON.stringify({ endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } }) })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(`Não foi possível registrar este aparelho${d?.message ? ` (${Array.isArray(d.message) ? d.message[0] : d.message})` : ''}`)
      }
      setEstado('ativo')
      await fetch('/api/push', { method: 'PUT' }) // aviso de teste
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível ativar os avisos')
    } finally { setOcupado(false) }
  }

  async function desativar() {
    setOcupado(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await fetch('/api/push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe() }
      setEstado('inativo')
    } finally { setOcupado(false) }
  }

  if (estado === 'carregando') return null
  if (estado === 'indisponivel') {
    const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
    return <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1"><BellOff size={12} /> {ios ? 'No iPhone, os avisos só funcionam no app instalado: toque em Compartilhar › Adicionar à Tela de Início e abra por lá.' : 'Este navegador não suporta avisos. Use o Chrome ou instale o app.'}</p>
  }
  if (estado === 'bloqueado') return <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1"><BellOff size={12} /> Avisos bloqueados. Libere as notificações nas configurações do site (cadeado ao lado do endereço). Em janela anônima eles não funcionam.</p>
  return (
    <div className="mb-3">
      {estado === 'inativo' ? (
        <button onClick={ativar} disabled={ocupado} className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold py-2.5 disabled:opacity-60">
          {ocupado ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} Ativar avisos de novas O.S.
        </button>
      ) : (
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Bell size={12} /> Avisos ativos neste aparelho</span>
          <button onClick={() => { void fetch('/api/push', { method: 'PUT' }); setMsg('Teste enviado: o aviso deve chegar em instantes.') }} className="underline">testar</button>
          <button onClick={desativar} disabled={ocupado} className="underline">desativar</button>
        </div>
      )}
      {msg && <p className="text-xs text-destructive mt-1">{msg}</p>}
    </div>
  )
}
