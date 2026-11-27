import { api } from '@/lib/api'
import type { Fornecedor } from '@/lib/suprimentos'
import { FornecedoresClient } from './fornecedores-client'

export default async function FornecedoresPage({ searchParams }: { searchParams: Promise<{ q?: string; ativo?: string }> }) {
  const { q = '', ativo = '' } = await searchParams
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (ativo) qs.set('ativo', ativo)
  const fornecedores = await api.get<Fornecedor[]>(`/fornecedores?${qs}`).catch(() => [] as Fornecedor[])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Fornecedores</h1>
        <p className="text-gray-500 text-sm mt-1">De quem você compra produtos e materiais. Usados nas entradas de estoque e nos produtos.</p>
      </div>
      <FornecedoresClient fornecedores={fornecedores} q={q} ativo={ativo} />
    </div>
  )
}
