'use client'

import { useTransition, useState } from 'react'
import { criarOs } from './actions'

type Equipamento = {
  id: string
  nome: string
  tipoEquipamento: string
  marca: string
  ambienteId: string
  ambiente: {
    id: string
    nome: string
    localizacaoInterna: string
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  }
}
type Tecnico = { id: string; email: string }

export function NovaOsForm({
  equipamentos,
  tecnicos,
}: {
  equipamentos: Equipamento[]
  tecnicos: Tecnico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')

  const hoje = new Date().toISOString().split('T')[0]

  // Clientes únicos
  const clientes = Array.from(
    new Map(
      equipamentos.map((e) => [e.ambiente.cliente.id, e.ambiente.cliente])
    ).values()
  ).sort((a, b) => (a.nomeFantasia ?? a.razaoSocial).localeCompare(b.nomeFantasia ?? b.razaoSocial))

  const equipsFiltrados = clienteId
    ? equipamentos.filter((e) => e.ambiente.cliente.id === clienteId)
    : equipamentos

  const equipSelecionado = equipamentos.find((e) => e.id === equipamentoId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!equipSelecionado) return
    const fd = new FormData(e.currentTarget)
    const tecnicoId        = fd.get('tecnicoId') as string
    const dataAgendamento  = fd.get('dataAgendamento') as string
    const observacoesGerais = fd.get('observacoesGerais') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarOs(equipSelecionado.ambienteId, tecnicoId, dataAgendamento, observacoesGerais)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar O.S.'
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
          onChange={(e) => { setClienteId(e.target.value); setEquipamentoId('') }}
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

      {/* Equipamento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Equipamento <span className="text-destructive">*</span>
        </label>
        <select
          value={equipamentoId}
          onChange={(e) => setEquipamentoId(e.target.value)}
          required
          disabled={!clienteId}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white disabled:opacity-50"
        >
          <option value="">{clienteId ? 'Selecione o equipamento…' : 'Selecione o cliente primeiro…'}</option>
          {equipsFiltrados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} — {e.tipoEquipamento} ({e.ambiente.nome})
            </option>
          ))}
        </select>
        {equipSelecionado && (
          <p className="text-xs text-gray-400 mt-1">
            Ambiente: {equipSelecionado.ambiente.nome} · {equipSelecionado.ambiente.localizacaoInterna}
          </p>
        )}
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
          disabled={isPending || !equipamentoId}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Ordem de Serviço'}
        </button>
      </div>
    </form>
  )
}
