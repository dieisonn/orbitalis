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
      const r = await fetch('/api/push', { method: 'POST', body: JSON.stringify(sub.toJSON()) })
      if (!r.ok) throw new Error('Não foi possível registrar este aparelho')
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

  if (estado === 'carregando' || estado === 'indisponivel') return null
  if (estado === 'bloqueado') return <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1"><BellOff size={12} /> Avisos bloqueados no navegador. Libere nas configurações do site para receber novas O.S.</p>
  return (
    <div className="mb-3">
      {estado === 'inativo' ? (
        <button onClick={ativar} disabled={ocupado} className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold py-2.5 disabled:opacity-60">
          {ocupado ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} Ativar avisos de novas O.S.
        </button>
      ) : (
        <button onClick={desativar} disabled={ocupado} className="text-[11px] text-gray-400 flex items-center gap-1"><Bell size={12} /> Avisos ativos neste aparelho · desativar</button>
      )}
      {msg && <p className="text-xs text-destructive mt-1">{msg}</p>}
    </div>
  )
}
