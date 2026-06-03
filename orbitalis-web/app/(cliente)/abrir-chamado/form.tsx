'use client'

import { useTransition, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { abrirChamado } from './actions'

type Ambiente = { id: string; nome: string; localizacaoInterna: string }

export function AbrirChamadoForm({
  ambientes,
  erro,
}: {
  ambientes: Ambiente[]
  erro?: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ambienteId  = fd.get('ambienteId') as string
    const observacoes = fd.get('observacoesGerais') as string

    setLocalError(null)
    startTransition(async () => {
      try {
        await abrirChamado(ambienteId, observacoes)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao abrir chamado'
        if (!msg.includes('NEXT_REDIRECT')) setLocalError(msg)
      }
    })
  }

  const errorMsg = localError ?? erro

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#c9a000' }} />
        <p className="text-xs text-gray-600">
          Use este formulário apenas para <strong>urgências</strong>. A equipe de
          manutenção será notificada e atenderá em até 24h.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ambiente com problema <span className="text-destructive">*</span>
        </label>
        <select
          name="ambienteId" required
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o ambiente…</option>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} — {a.localizacaoInterna}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição do problema
        </label>
        <textarea
          name="observacoesGerais" rows={4}
          placeholder="Descreva o sintoma: ruídos, temperatura fora do esperado, vazamentos…"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          {errorMsg}
        </p>
      )}

      <button
        id="btn-abrir-chamado"
        type="submit"
        disabled={isPending || ambientes.length === 0}
        className="w-full py-2.5 bg-destructive text-white font-semibold rounded-lg text-sm hover:bg-destructive/90 disabled:opacity-60 transition-colors"
      >
        {isPending ? 'Enviando chamado…' : 'Abrir Chamado Urgente'}
      </button>
    </form>
  )
}
