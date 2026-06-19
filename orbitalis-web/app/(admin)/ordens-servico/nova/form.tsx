'use client'

import { useTransition, useState } from 'react'
import { criarOs } from './actions'

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
type TipoServico = { id: string; sigla: string; nome: string; corHex: string; ativo: boolean }

export function NovaOsForm({
  ambientes,
  tecnicos,
  tiposServico,
}: {
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
  tiposServico: TipoServico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [clienteId, setClienteId]   = useState('')
  const [ambienteId, setAmbienteId] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [tipoServicoId, setTipoServicoId] = useState('')

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
  const tipoSelecionado     = tiposServico.find((t) => t.id === tipoServicoId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ambienteId) return
    const fd = new FormData(e.currentTarget)
    const tecnicoId         = fd.get('tecnicoId')         as string
    const dataAgendamento   = fd.get('dataAgendamento')   as string
    const horaInicio        = fd.get('horaInicio')        as string
    const horaFim           = fd.get('horaFim')           as string
    const observacoesGerais = fd.get('observacoesGerais') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarOs({
          ambienteId,
          tecnicoId,
          dataAgendamento,
          observacoesGerais,
          tipoServicoId,
          equipamentoId,
          horaInicio,
          horaFim,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar O.S.'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Tipo de Serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Serviço <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {tiposServico.map((ts) => (
            <button
              key={ts.id}
              type="button"
              onClick={() => setTipoServicoId(tipoServicoId === ts.id ? '' : ts.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all text-left ${
                tipoServicoId === ts.id
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border text-gray-600 hover:bg-surface'
              }`}
              style={tipoServicoId === ts.id ? { backgroundColor: ts.corHex } : {}}
            >
              <span
                className="shrink-0 text-xs font-bold w-7 text-center py-0.5 rounded text-white"
                style={{ backgroundColor: tipoServicoId === ts.id ? 'rgba(255,255,255,0.25)' : ts.corHex }}
              >
                {ts.sigla}
              </span>
              <span className="truncate text-xs leading-tight">{ts.nome}</span>
            </button>
          ))}
        </div>
        {tiposServico.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Nenhum tipo cadastrado.{' '}
            <a href="/servicos" className="text-primary underline">Cadastrar em Serviços</a>
          </p>
        )}
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

      {/* Equipamento */}
      {ambienteSelecionado && ambienteSelecionado.equipamentos.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipamento
            <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
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

      {/* Técnico */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsável</label>
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

      {/* Horários */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Início</label>
          <input
            name="horaInicio"
            type="time"
            defaultValue="08:00"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Término</label>
          <input
            name="horaFim"
            type="time"
            defaultValue="10:00"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          name="observacoesGerais"
          rows={3}
          placeholder="Descreva o serviço ou observações relevantes…"
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
          style={tipoSelecionado ? { backgroundColor: tipoSelecionado.corHex } : {}}
          className={`flex-1 py-2.5 text-white font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors ${
            !tipoSelecionado ? 'bg-action hover:bg-action/90' : 'hover:opacity-90'
          }`}
        >
          {isPending
            ? 'Criando…'
            : tipoSelecionado
              ? `Criar ${tipoSelecionado.sigla} — O.S.`
              : 'Criar Ordem de Serviço'}
        </button>
      </div>
    </form>
  )
}
