'use client'

import { useTransition, useState, useRef } from 'react'
import { criarAmbiente } from './actions'
import { ClienteSelect } from '@/components/ui/cliente-select'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export function NovoAmbienteForm({ clientes, clienteIdInicial }: { clientes: Cliente[]; clienteIdInicial?: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteSel, setClienteSel] = useState(clienteIdInicial ?? '')
  const [criados, setCriados] = useState<string[]>([])
  const nomeRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const continuar = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'continuar'
    const fd = new FormData(e.currentTarget)
    const clienteId         = fd.get('clienteId') as string
    const nome              = fd.get('nome') as string
    const metrosQuadrados   = fd.get('metrosQuadrados') as string
    const capacidadeTermica = fd.get('capacidadeTermica') as string
    const localizacaoInterna = fd.get('localizacaoInterna') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarAmbiente(clienteId, nome, metrosQuadrados, capacidadeTermica, localizacaoInterna, continuar)
        if (continuar) {
          setCriados((l) => [...l, nome])
          formRef.current?.reset() // o cliente fica (select controlado)
          nomeRef.current?.focus()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar ambiente'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-destructive">*</span>
        </label>
        <ClienteSelect name="clienteId" required clientes={clientes} value={clienteSel} onChange={setClienteSel} ariaLabel="Cliente" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Ambiente <span className="text-destructive">*</span>
        </label>
        <input
          name="nome"
          ref={nomeRef}
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

      {criados.length > 0 && (
        <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          Criado: {criados[criados.length - 1]}
          {criados.length > 1 ? ` (${criados.length} ambientes nesta sessão)` : ''}. Preencha o próximo ou volte à lista.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/ambientes"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          {criados.length > 0 ? 'Concluir' : 'Cancelar'}
        </a>
        <button
          type="submit"
          value="continuar"
          disabled={isPending}
          className="flex-1 py-2.5 border border-action text-action font-semibold rounded-lg text-sm hover:bg-action/5 disabled:opacity-60 transition-colors"
        >
          Criar e adicionar outro
        </button>
        <button
          type="submit"
          value="fim"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Ambiente'}
        </button>
      </div>
    </form>
  )
}
