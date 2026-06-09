'use client'

import { useTransition, useState } from 'react'
import { criarEquipamento } from './actions'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

const TIPOS = [
  'Split Hi-Wall',
  'Split Cassete',
  'Split Piso-Teto',
  'Split Dutado',
  'Chiller',
  'Fancoil',
  'VRF / VRV',
  'Janela',
  'Cortina de Ar',
  'Outro',
]

export function NovoEquipamentoForm({ ambientes }: { ambientes: Ambiente[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')

  // Clientes únicos a partir dos ambientes
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
    const ambienteId      = fd.get('ambienteId') as string
    const nome            = fd.get('nome') as string
    const marca           = fd.get('marca') as string
    const modelo          = fd.get('modelo') as string
    const numeroSerie     = fd.get('numeroSerie') as string
    const tipoEquipamento = fd.get('tipoEquipamento') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarEquipamento(ambienteId, nome, marca, modelo, numeroSerie, tipoEquipamento)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar equipamento'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente
        </label>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Todos os clientes…</option>
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
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o ambiente…</option>
          {ambientesFiltrados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
              {a.cliente && !clienteId ? ` — ${a.cliente.nomeFantasia ?? a.cliente.razaoSocial}` : ''}
              {a.localizacaoInterna ? ` (${a.localizacaoInterna})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Equipamento <span className="text-destructive">*</span>
        </label>
        <input
          name="nome"
          required
          minLength={2}
          placeholder="Ex: AC Sala Reuniões 1"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo <span className="text-destructive">*</span>
        </label>
        <select
          name="tipoEquipamento"
          required
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o tipo…</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca <span className="text-destructive">*</span>
          </label>
          <input
            name="marca"
            required
            placeholder="Ex: Daikin"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo
          </label>
          <input
            name="modelo"
            placeholder="Ex: FTXS35LVMA (opcional)"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de Série
        </label>
        <input
          name="numeroSerie"
          placeholder="Nº série da placa (opcional)"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/equipamentos"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Equipamento'}
        </button>
      </div>
    </form>
  )
}
