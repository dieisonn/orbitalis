'use client'

import { useTransition, useState } from 'react'
import { abrirChamadoQr } from './actions'
import { CheckCircle, Loader2 } from 'lucide-react'

type Props = {
  ambienteId: string
  ambienteNome: string
}

export function AbrirChamadoForm({ ambienteId, ambienteNome }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [osId, setOsId] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = fd.get('dataAgendamento') as string
    const obs = fd.get('observacoes') as string

    setError(null)
    startTransition(async () => {
      try {
        const os = await abrirChamadoQr(ambienteId, data, obs)
        setOsId(os.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao abrir chamado'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  if (osId) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle size={40} className="text-green-500" />
        <p className="font-semibold text-gray-800">Chamado aberto com sucesso!</p>
        <p className="text-sm text-gray-500 font-mono">OS-{osId.slice(0, 6).toUpperCase()}</p>
        <p className="text-xs text-gray-400 text-center">
          Um administrador irá triagem e atribuir um técnico em breve.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border mt-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Abrir Chamado de Manutenção</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Ambiente
        </label>
        <p className="text-sm font-semibold text-gray-800">{ambienteNome}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Data desejada <span className="text-destructive">*</span>
        </label>
        <input
          name="dataAgendamento"
          type="date"
          required
          min={hoje}
          defaultValue={hoje}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Descreva o problema
        </label>
        <textarea
          name="observacoes"
          rows={3}
          placeholder="Ex: Ar condicionado não está resfriando adequadamente…"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? 'Abrindo chamado…' : 'Abrir Chamado'}
      </button>
    </form>
  )
}
