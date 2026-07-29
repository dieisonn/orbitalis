'use client'

import { useState, useTransition } from 'react'
import { trocarSenha } from './actions'
import { Lock, Check, Loader2 } from 'lucide-react'

export function SenhaForm() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget
    const senhaAtual = (f.elements.namedItem('senhaAtual')  as HTMLInputElement).value
    const novaSenha  = (f.elements.namedItem('novaSenha')   as HTMLInputElement).value
    const confirmar  = (f.elements.namedItem('confirmar')   as HTMLInputElement).value

    if (novaSenha !== confirmar) {
      setError('As senhas não coincidem')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await trocarSenha(senhaAtual, novaSenha)
        f.reset()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao trocar senha')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha atual</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            name="senhaAtual"
            type="password"
            required
            placeholder="••••••••"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              name="novaSenha"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar nova senha</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              name="confirmar"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {saved && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
          <Check size={13} />Senha alterada com sucesso
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" />Atualizando…</>
          ) : (
            'Alterar senha'
          )}
        </button>
      </div>
    </form>
  )
}
