import { api } from '@/lib/api'
import type { Fornecedor, Produto } from '@/lib/suprimentos'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; categoria?: string; ativo?: string }> }) {
  const { q = '', situacao = '', categoria = '', ativo = '' } = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries({ q, situacao, categoria, ativo })) if (v) qs.set(k, v)
  const [produtos, categorias, fornecedores] = await Promise.all([
    api.get<Produto[]>(`/produtos?${qs}`).catch(() => [] as Produto[]),
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
    api.get<Fornecedor[]>('/fornecedores?ativo=true').catch(() => [] as Fornecedor[]),
  ])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
        <p className="text-gray-500 text-sm mt-1">Peças, gases e materiais com preço de custo, preço de venda e saldo em estoque.</p>
      </div>
      <ProdutosClient produtos={produtos} categorias={categorias} fornecedores={fornecedores} filtros={{ q, situacao, categoria, ativo }} />
    </div>
  )
}
