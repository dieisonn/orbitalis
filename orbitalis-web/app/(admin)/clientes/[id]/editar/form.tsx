'use client'

import { useTransition, useState } from 'react'
import { editarCliente } from './actions'

type Props = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  endereco: string
  telefone: string | null
}

export function EditarClienteForm({ id, razaoSocial, nomeFantasia, endereco, telefone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await editarCliente(id, {
          razaoSocial: fd.get('razaoSocial') as string,
          nomeFantasia: fd.get('nomeFantasia') as string,
          endereco: fd.get('endereco') as string,
          telefone: (fd.get('telefone') as string) || undefined,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Razão Social <span className="text-destructive">*</span>
        </label>
        <input
          name="razaoSocial"
          required
          defaultValue={razaoSocial}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Fantasia
        </label>
        <input
          name="nomeFantasia"
          defaultValue={nomeFantasia ?? ''}
          placeholder="Nome comercial (opcional)"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endereço <span className="text-destructive">*</span>
        </label>
        <input
          name="endereco"
          required
          defaultValue={endereco}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telefone
        </label>
        <input
          name="telefone"
          defaultValue={telefone ?? ''}
          placeholder="(00) 00000-0000"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/clientes"
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
