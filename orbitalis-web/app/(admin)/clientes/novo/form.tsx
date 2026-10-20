'use client'

import { useTransition, useState, useRef } from 'react'
import { Search, CheckCircle } from 'lucide-react'
import { ConvidarBtn } from '@/components/ui/convidar-btn'
import { consultarCnpj, criarCliente, type CriarClienteResult } from './actions'

type Prefill = { razaoSocial: string; nomeFantasia: string; endereco: string }

export function NovoClienteForm() {
  const [isPending, startTransition] = useTransition()
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CriarClienteResult | null>(null)
  const [prefill, setPrefill] = useState<Prefill>({ razaoSocial: '', nomeFantasia: '', endereco: '' })
  const cnpjRef = useRef<HTMLInputElement>(null)

  function handleConsultar() {
    const cnpj = cnpjRef.current?.value ?? ''
    if (cnpj.replace(/\D/g, '').length < 11) {
      setError('Informe um CNPJ ou CPF válido')
      return
    }
    setError(null)
    setCnpjLoading(true)
    startTransition(async () => {
      try {
        const data = await consultarCnpj(cnpj)
        setPrefill(data)
      } catch {
        setError('CNPJ não encontrado na Receita Federal')
      } finally {
        setCnpjLoading(false)
      }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campo = (n: string) => ((fd.get(n) as string) ?? '').trim()

    setError(null)
    startTransition(async () => {
      try {
        const result = await criarCliente({
          documento: campo('documento'), razaoSocial: campo('razaoSocial'), nomeFantasia: campo('nomeFantasia'),
          endereco: campo('endereco'), telefone: campo('telefone'), celular: campo('celular'),
          email: campo('email'), cidade: campo('cidade'), uf: campo('uf'),
        })
        setSuccess(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar cliente')
      }
    })
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle size={48} className="text-action" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">Cliente criado com sucesso!</p>
          <p className="text-sm text-gray-500 mt-1">
            O cadastro está pronto. Para o cliente acessar o portal, envie um convite: ele mesmo escolhe e-mail e senha.
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Acesso ao Portal do Cliente (opcional)
          </p>
          <ConvidarBtn tipo="cliente" clienteId={success.clienteId} label="Gerar link de convite" />
          <p className="text-xs text-gray-400">
            O link vale por 7 dias e só pode ser usado uma vez. Você também pode gerar depois, na lista de clientes.
          </p>
        </div>
        <a
          href="/clientes"
          className="inline-flex items-center justify-center w-full py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 transition-colors"
        >
          Ir para lista de Clientes
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* CNPJ / CPF com consulta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CNPJ ou CPF <span className="text-gray-500 font-normal">(opcional)</span>
        </label>
        <div className="flex gap-2">
          <input
            ref={cnpjRef}
            name="documento"
            placeholder="00.000.000/0000-00"
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={handleConsultar}
            disabled={cnpjLoading || isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <Search size={14} />
            {cnpjLoading ? 'Consultando…' : 'Consultar'}
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
          value={prefill.razaoSocial}
          onChange={(e) => setPrefill((p) => ({ ...p, razaoSocial: e.target.value }))}
          placeholder="Nome jurídico da empresa"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Fantasia
        </label>
        <input
          name="nomeFantasia"
          value={prefill.nomeFantasia}
          onChange={(e) => setPrefill((p) => ({ ...p, nomeFantasia: e.target.value }))}
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
          value={prefill.endereco}
          onChange={(e) => setPrefill((p) => ({ ...p, endereco: e.target.value }))}
          placeholder="Rua, número, bairro, cidade/UF"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input name="telefone" placeholder="(00) 0000-0000"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
          <input name="celular" placeholder="(00) 00000-0000"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input name="email" type="email" placeholder="contato@empresa.com.br"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input name="cidade"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
          <input name="uf" maxLength={2} placeholder="MG"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40" />
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
          {isPending ? 'Criando…' : 'Criar Cliente'}
        </button>
      </div>
    </form>
  )
}
