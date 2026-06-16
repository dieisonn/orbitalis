'use client'

import { useTransition, useState } from 'react'
import { criarOs } from './actions'
import { Wrench, ShieldCheck } from 'lucide-react'

type Equipamento = { id: string; nome: string; tipoEquipamento: string }

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  clienteId: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  equipamentos: Equipamento[]
}

type Tecnico = { id: string; email: string; nome: string | null }

export function NovaOsForm({
  ambientes,
  tecnicos,
}: {
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [clienteId, setClienteId]   = useState('')
  const [ambienteId, setAmbienteId] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [tipo, setTipo]             = useState<'corretiva' | 'preventiva'>('corretiva')

  const hoje = new Date().toISOString().split('T')[0]

  const clientes = Array.from(
    new Map(
      ambientes
        .filter((a) => a.cliente)
        .map((a) => [a.cliente!.id, a.cliente!])
    ).values(),
  ).sort((a, b) =>
    (a.nomeFantasia ?? a.razaoSocial).localeCompare(b.nomeFantasia ?? b.razaoSocial),
  )

  const ambientesFiltrados = clienteId
    ? ambientes.filter((a) => a.clienteId === clienteId)
    : []

  const ambienteSelecionado = ambientes.find((a) => a.id === ambienteId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ambienteId) return
    const fd = new FormData(e.currentTarget)
    const tecnicoId         = fd.get('tecnicoId')        as string
    const dataAgendamento   = fd.get('dataAgendamento')  as string
    const observacoesGerais = fd.get('observacoesGerais') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarOs(ambienteId, tecnicoId, dataAgendamento, observacoesGerais, tipo, equipamentoId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar O.S.'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Tipo da O.S. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Manutenção <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('corretiva')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              tipo === 'corretiva'
                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                : 'border-border text-gray-500 hover:bg-surface'
            }`}
          >
            <Wrench size={15} />
            Corretiva
          </button>
          <button
            type="button"
            onClick={() => setTipo('preventiva')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              tipo === 'preventiva'
                ? 'bg-action/10 border-action/40 text-action'
                : 'border-border text-gray-500 hover:bg-surface'
            }`}
          >
            <ShieldCheck size={15} />
            Preventiva
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-destructive">*</span>
        </label>
        <select
          value={clienteId}
          onChange={(e) => { setClienteId(e.target.value); setAmbienteId(''); setEquipamentoId('') }}
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
          Ambiente / Local <span className="text-destructive">*</span>
        </label>
        <select
          value={ambienteId}
          onChange={(e) => { setAmbienteId(e.target.value); setEquipamentoId('') }}
          required
          disabled={!clienteId}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white disabled:opacity-50"
        >
          <option value="">
            {clienteId ? 'Selecione o ambiente…' : 'Selecione o cliente primeiro…'}
          </option>
          {ambientesFiltrados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}{a.localizacaoInterna ? ` — ${a.localizacaoInterna}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Equipamento específico */}
      {ambienteSelecionado && ambienteSelecionado.equipamentos.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipamento
            <span className="ml-1 text-xs font-normal text-gray-400">(opcional — deixe em branco para todos)</span>
          </label>
          <select
            value={equipamentoId}
            onChange={(e) => setEquipamentoId(e.target.value)}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          >
            <option value="">Todos os equipamentos do ambiente</option>
            {ambienteSelecionado.equipamentos.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nome} — {eq.tipoEquipamento}
              </option>
            ))}
          </select>
        </div>
      )}

      {ambienteSelecionado && ambienteSelecionado.equipamentos.length === 0 && (
        <p className="text-xs text-amber-600">
          Nenhum equipamento cadastrado neste ambiente.
        </p>
      )}

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
            <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
          ))}
        </select>
      </div>

      {/* Data */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data de Agendamento <span className="text-destructive">*</span>
        </label>
        <input
          name="dataAgendamento"
          type="date"
          required
          defaultValue={hoje}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Observações */}
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
          disabled={isPending || !ambienteId}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Ordem de Serviço'}
        </button>
      </div>
    </form>
  )
}
