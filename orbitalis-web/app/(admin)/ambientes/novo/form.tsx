'use client'

import { useTransition, useState } from 'react'
import { criarAmbiente } from './actions'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export function NovoAmbienteForm({ clientes }: { clientes: Cliente[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const clienteId         = fd.get('clienteId') as string
    const nome              = fd.get('nome') as string
    const metrosQuadrados   = fd.get('metrosQuadrados') as string
    const capacidadeTermica = fd.get('capacidadeTermica') as string
    const localizacaoInterna = fd.get('localizacaoInterna') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarAmbiente(clienteId, nome, metrosQuadrados, capacidadeTermica, localizacaoInterna)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar ambiente'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-destructive">*</span>
        </label>
        <select
          name="clienteId"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Ambiente <span className="text-destructive">*</span>
        </label>
        <input
          name="nome"
          required
          minLength={2}
          placeholder="Ex: Sala de Servidores, Recepção"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Área (m²) <span className="text-destructive">*</span>
          </label>
          <input
            name="metrosQuadrados"
            type="number"
            required
            min="1"
            step="0.1"
            placeholder="Ex: 45.5"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cap. Térmica <span className="text-destructive">*</span>
          </label>
          <input
            name="capacidadeTermica"
            required
            placeholder="Ex: 36.000 BTU"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Localização Interna <span className="text-destructive">*</span>
        </label>
        <input
          name="localizacaoInterna"
          required
          minLength={2}
          placeholder="Ex: 2º andar, ala norte"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/ambientes"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Ambiente'}
        </button>
      </div>
    </form>
  )
}
