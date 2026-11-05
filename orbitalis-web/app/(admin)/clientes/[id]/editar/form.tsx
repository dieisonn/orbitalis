'use client'

import { EnderecoInput } from '@/components/ui/endereco-input'
import { EnderecosExtras, type EnderecoExtra } from '@/components/ui/enderecos-extras'
import { useTransition, useState } from 'react'
import { Search } from 'lucide-react'
import { editarCliente } from './actions'
import { consultarCnpj } from '../../novo/actions'

type Props = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  endereco: string
  enderecosExtras?: { id?: string; rotulo: string; endereco: string }[]
  telefone: string | null
  documento: string | null
  celular: string | null
  email: string | null
  cidade: string | null
  uf: string | null
}

export function EditarClienteForm({ id, razaoSocial, nomeFantasia, endereco, enderecosExtras: extrasIniciais, telefone, documento, celular, email, cidade, uf }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [extras, setExtras] = useState<EnderecoExtra[]>(extrasIniciais ?? [])
  const [dados, setDados] = useState({ razaoSocial, nomeFantasia: nomeFantasia ?? '', endereco })
  const [doc, setDoc] = useState(documento ?? '')

  async function consultar() {
    if (doc.replace(/\D/g, '').length < 11) { setError('Informe um CNPJ ou CPF válido'); return }
    setError(null); setCnpjLoading(true)
    try {
      const d = await consultarCnpj(doc)
      setDados((p) => ({ razaoSocial: d.razaoSocial || p.razaoSocial, nomeFantasia: d.nomeFantasia || p.nomeFantasia, endereco: d.endereco || p.endereco }))
    } catch { setError('CNPJ não encontrado na Receita Federal') }
    finally { setCnpjLoading(false) }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const campo = (n: string) => ((fd.get(n) as string) ?? '').trim()
        const r = await editarCliente(id, {
          documento: campo('documento'), razaoSocial: campo('razaoSocial'), nomeFantasia: campo('nomeFantasia'),
          endereco: campo('endereco'), enderecosExtras: extras.filter((x) => x.endereco.trim()), telefone: campo('telefone'), celular: campo('celular'),
          email: campo('email'), cidade: campo('cidade'), uf: campo('uf'),
        })
        if (r && 'error' in r) setError(r.error)
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
        <div className="flex gap-2">
          <input name="documento" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="00.000.000/0000-00" className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button type="button" onClick={consultar} disabled={cnpjLoading || isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 disabled:opacity-60 transition-colors whitespace-nowrap">
            <Search size={14} /> {cnpjLoading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Razão Social <span className="text-destructive">*</span>
        </label>
        <input
          name="razaoSocial"
          required
          value={dados.razaoSocial}
          onChange={(e) => setDados((p) => ({ ...p, razaoSocial: e.target.value }))}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Fantasia
        </label>
        <input
          name="nomeFantasia"
          value={dados.nomeFantasia}
          onChange={(e) => setDados((p) => ({ ...p, nomeFantasia: e.target.value }))}
          placeholder="Nome comercial (opcional)"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endereço
        </label>
        <EnderecoInput
          value={dados.endereco}
          onChange={(v) => setDados((p) => ({ ...p, endereco: v }))}
          ariaLabel="Endereço"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input type="hidden" name="endereco" value={dados.endereco} />
      </div>

      <EnderecosExtras value={extras} onChange={setExtras} cidade={cidade} uf={uf} />
      <div>
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
