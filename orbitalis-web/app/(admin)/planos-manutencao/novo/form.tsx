'use client'

import { useTransition, useState } from 'react'
import { criarPlano } from './actions'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}
type Tecnico   = { id: string; email: string }
type Checklist = { id: string; nome: string }

const FREQUENCIAS = [
  { label: 'Mensal (30 dias)',      value: 30 },
  { label: 'Bimestral (60 dias)',   value: 60 },
  { label: 'Trimestral (90 dias)',  value: 90 },
  { label: 'Semestral (180 dias)',  value: 180 },
  { label: 'Anual (365 dias)',      value: 365 },
]

export function NovoPlanoForm({
  ambientes,
  tecnicos,
  checklists,
}: {
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
  checklists: Checklist[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')

  const hoje = new Date().toISOString().split('T')[0]

  const clientes = Array.from(
    new Map(
      ambientes
        .filter((a) => a.cliente)
        .map((a) => [a.cliente!.id, a.cliente!])
    ).values()
  ).sort((a, b) => (a.nomeFantasia ?? a.razaoSocial).localeCompare(b.nomeFantasia ?? b.razaoSocial))

  const ambientesFiltrados = clienteId
    ? ambientes.filter((a) => a.cliente?.id === clienteId)
    : ambientes

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ambienteId        = fd.get('ambienteId') as string
    const tecnicoId         = fd.get('tecnicoId') as string
    const frequenciaDias    = Number(fd.get('frequenciaDias'))
    const proximaGeracao    = fd.get('proximaGeracao') as string
    const modeloChecklistId = fd.get('modeloChecklistId') as string
    const dataFim           = fd.get('dataFim') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarPlano(ambienteId, tecnicoId, frequenciaDias, proximaGeracao, modeloChecklistId, dataFim)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar plano'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-destructive">*</span>
        </label>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeFantasia ?? c.razaoSocial}
            </option>
          ))}
        </select>
      </div>

      {/* Ambiente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ambiente <span className="text-destructive">*</span>
        </label>
        <select
          name="ambienteId"
          required
          disabled={!clienteId}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white disabled:opacity-50"
        >
          <option value="">{clienteId ? 'Selecione o ambiente…' : 'Selecione o cliente primeiro…'}</option>
          {ambientesFiltrados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} ({a.localizacaoInterna})
            </option>
          ))}
        </select>
      </div>

      {/* Técnico */}
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

      {/* Checklist */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Checklist de Manutenção
        </label>
        <select
          name="modeloChecklistId"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Sem checklist (inspeção livre)…</option>
          {checklists.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          O checklist selecionado será copiado em cada O.S. gerada automaticamente.
        </p>
      </div>

      {/* Frequência */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frequência de Manutenção <span className="text-destructive">*</span>
        </label>
        <select
          name="frequenciaDias"
          required
          defaultValue={90}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          {FREQUENCIAS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Primeira geração */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Primeira Geração de O.S. <span className="text-destructive">*</span>
        </label>
        <input
          name="proximaGeracao"
          type="date"
          required
          min={hoje}
          defaultValue={hoje}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-gray-400 mt-1">
          O cron irá gerar a primeira O.S. automaticamente nesta data.
        </p>
      </div>

      {/* Data fim */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Limite do Plano
        </label>
        <input
          name="dataFim"
          type="date"
          min={hoje}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-gray-400 mt-1">
          Opcional. Nenhuma O.S. será gerada após esta data. Deixe em branco para plano contínuo.
        </p>
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
          {isPending ? 'Criando…' : 'Criar Plano Preventivo'}
        </button>
      </div>
    </form>
  )
}
