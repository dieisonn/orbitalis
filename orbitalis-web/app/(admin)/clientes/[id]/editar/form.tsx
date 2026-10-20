'use client'

import { useTransition, useState } from 'react'
import { editarCliente } from './actions'

type Props = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  endereco: string
  telefone: string | null
  documento: string | null
  celular: string | null
  email: string | null
  cidade: string | null
  uf: string | null
}

export function EditarClienteForm({ id, razaoSocial, nomeFantasia, endereco, telefone, documento, celular, email, cidade, uf }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const campo = (n: string) => ((fd.get(n) as string) ?? '').trim()
        await editarCliente(id, {
          documento: campo('documento'), razaoSocial: campo('razaoSocial'), nomeFantasia: campo('nomeFantasia'),
          endereco: campo('endereco'), telefone: campo('telefone'), celular: campo('celular'),
          email: campo('email'), cidade: campo('cidade'), uf: campo('uf'),
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
          CNPJ ou CPF <span className="text-gray-500 font-normal">(opcional)</span>
        </label>
        <input name="documento" defaultValue={documento ?? ''} placeholder="00.000.000/0000-00" className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

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
          Endereço
        </label>
        <input
          name="endereco"
          defaultValue={endereco}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input name="telefone" defaultValue={telefone ?? ''} placeholder="(00) 0000-0000" className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
          <input name="celular" defaultValue={celular ?? ''} placeholder="(00) 00000-0000" className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input name="email" type="email" defaultValue={email ?? ''} className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input name="cidade" defaultValue={cidade ?? ''} className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
          <input name="uf" maxLength={2} defaultValue={uf ?? ''} className="w-full px-4 py-2.5 border border-border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
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
