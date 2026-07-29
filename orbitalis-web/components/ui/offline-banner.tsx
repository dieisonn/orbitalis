'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineBanner() {
  const [status, setStatus] = useState<'online' | 'offline' | 'reconnected' | null>(null)

  useEffect(() => {
    setStatus(navigator.onLine ? null : 'offline')

    let reconnectedTimer: ReturnType<typeof setTimeout>

    function handleOnline() {
      setStatus('reconnected')
      reconnectedTimer = setTimeout(() => setStatus(null), 3000)
    }
    function handleOffline() {
      clearTimeout(reconnectedTimer)
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(reconnectedTimer)
    }
  }, [])

  if (!status) return null

  if (status === 'reconnected') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-xs font-semibold">
        <Wifi size={12} />
        Conexão restabelecida — sincronizando…
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-semibold">
      <WifiOff size={12} />
      Sem conexão — alterações serão salvas localmente
    </div>
  )
}
