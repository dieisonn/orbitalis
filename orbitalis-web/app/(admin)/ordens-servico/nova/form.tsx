'use client'

import { useTransition, useState } from 'react'
import { criarOs } from './actions'

type Ambiente = { id: string; nome: string; localizacaoInterna: string }
type Tecnico  = { id: string; email: string }

export function NovaOsForm({
  ambientes,
  tecnicos,
}: {
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ambienteId       = fd.get('ambienteId') as string
    const tecnicoId        = fd.get('tecnicoId') as string
    const dataAgendamento  = fd.get('dataAgendamento') as string
    const observacoesGerais = fd.get('observacoesGerais') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarOs(ambienteId, tecnicoId, dataAgendamento, observacoesGerais)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar O.S.'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ambiente <span className="text-destructive">*</span>
        </label>
        <select
          name="ambienteId"
          required
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o ambiente…</option>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} ({a.localizacaoInterna})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Técnico Responsável
        </label>
        <select
          name="tecnicoId"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">A definir na triagem…</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.email}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data de Agendamento <span className="text-destructive">*</span>
        </label>
        <input
          name="dataAgendamento"
          type="date"
          required
          min={hoje}
          defaultValue={hoje}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          name="observacoesGerais"
          rows={3}
          placeholder="Descreva o serviço a ser executado ou observações relevantes…"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/ordens-servico"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Ordem de Serviço'}
        </button>
      </div>
    </form>
  )
}
