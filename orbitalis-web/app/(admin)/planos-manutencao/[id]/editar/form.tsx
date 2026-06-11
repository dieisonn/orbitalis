'use client'

import { useTransition, useState } from 'react'
import { editarPlano } from './actions'

const FREQUENCIAS = [
  { label: 'Mensal (30 dias)',      value: 30 },
  { label: 'Bimestral (60 dias)',   value: 60 },
  { label: 'Trimestral (90 dias)',  value: 90 },
  { label: 'Semestral (180 dias)',  value: 180 },
  { label: 'Anual (365 dias)',      value: 365 },
]

type Tecnico   = { id: string; email: string }
type Checklist = { id: string; nome: string }

type Props = {
  id: string
  tecnicoId: string | null
  modeloChecklistId: string | null
  frequenciaDias: number
  proximaGeracao: string
  dataFim: string | null
  ativo: boolean
  tecnicos: Tecnico[]
  checklists: Checklist[]
}

export function EditarPlanoForm({
  id,
  tecnicoId,
  modeloChecklistId,
  frequenciaDias,
  proximaGeracao,
  dataFim,
  ativo,
  tecnicos,
  checklists,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isAtivo, setIsAtivo] = useState(ativo)

  const proxDate  = proximaGeracao ? proximaGeracao.split('T')[0] : ''
  const fimDate   = dataFim        ? dataFim.split('T')[0]        : ''

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await editarPlano(id, {
          tecnicoId:         fd.get('tecnicoId') as string,
          frequenciaDias:    fd.get('frequenciaDias') as string,
          proximaGeracao:    fd.get('proximaGeracao') as string,
          modeloChecklistId: fd.get('modeloChecklistId') as string,
          dataFim:           fd.get('dataFim') as string,
          ativo: isAtivo,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Técnico */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Técnico Responsável
        </label>
        <select
          name="tecnicoId"
          defaultValue={tecnicoId ?? ''}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">A definir…</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.email}</option>
          ))}
        </select>
      </div>

      {/* Checklist */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Checklist de Manutenção
        </label>
        <select
          name="modeloChecklistId"
          defaultValue={modeloChecklistId ?? ''}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Sem checklist (inspeção livre)…</option>
          {checklists.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Frequência */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frequência de Manutenção <span className="text-destructive">*</span>
        </label>
        <select
          name="frequenciaDias"
          required
          defaultValue={frequenciaDias}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          {FREQUENCIAS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Próxima geração */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Próxima Geração de O.S. <span className="text-destructive">*</span>
        </label>
        <input
          name="proximaGeracao"
          type="date"
          required
          defaultValue={proxDate}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Data fim */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Limite do Plano
        </label>
        <input
          name="dataFim"
          type="date"
          defaultValue={fimDate}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-gray-400 mt-1">
          Opcional. Deixe em branco para plano contínuo.
        </p>
      </div>

      {/* Toggle ativo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsAtivo((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isAtivo ? 'bg-action' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isAtivo ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isAtivo ? 'Plano ativo — gerando O.S. automaticamente' : 'Plano inativo'}
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/planos-manutencao"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
