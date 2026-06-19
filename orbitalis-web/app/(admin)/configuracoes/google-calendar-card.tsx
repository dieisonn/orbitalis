'use client'

import { useState, useTransition } from 'react'
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { desconectarGoogle } from './actions'

export function GoogleCalendarCard({
  conectado,
  email,
}: {
  conectado: boolean
  email: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConectar() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/google-auth-url')
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else setError('Integração não configurada no servidor.')
      } catch {
        setError('Erro ao obter URL de autenticação.')
      }
    })
  }

  function handleDesconectar() {
    setError(null)
    startTransition(async () => {
      try {
        await desconectarGoogle()
      } catch {
        setError('Erro ao desconectar.')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Google Agenda</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Lança automaticamente cada O.S. no seu calendário Google.
            </p>
          </div>
        </div>

        {conectado ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
            <CheckCircle size={12} />
            Conectado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
            <XCircle size={12} />
            Desconectado
          </span>
        )}
      </div>

      {conectado && email && (
        <p className="mt-4 text-xs text-gray-500">
          Conta conectada: <span className="font-medium text-gray-700">{email}</span>
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="mt-4">
        {conectado ? (
          <button
            onClick={handleDesconectar}
            disabled={isPending}
            className="text-sm text-gray-500 hover:text-destructive border border-border px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Desconectar
          </button>
        ) : (
          <button
            onClick={handleConectar}
            disabled={isPending}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            }
            {isPending ? 'Aguardando…' : 'Conectar com Google'}
          </button>
        )}
      </div>
    </div>
  )
}
