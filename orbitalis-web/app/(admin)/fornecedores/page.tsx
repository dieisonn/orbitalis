import { api } from '@/lib/api'
import type { Fornecedor } from '@/lib/suprimentos'
import { lerPaginacao } from '@/lib/paginacao'
import { FornecedoresClient } from './fornecedores-client'

export default async function FornecedoresPage({ searchParams }: { searchParams: Promise<{ q?: string; ativo?: string; pagina?: string; limite?: string }> }) {
  const { q = '', ativo = '', ...pg } = await searchParams
  const { pagina, limite } = lerPaginacao(pg.pagina, pg.limite)
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (ativo) qs.set('ativo', ativo)
  qs.set('pagina', String(pagina)); qs.set('limite', String(limite))
  const resp = await api.get<{ itens: Fornecedor[]; total: number }>(`/fornecedores?${qs}`).catch(() => ({ itens: [] as Fornecedor[], total: 0 }))
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Fornecedores</h1>
        <p className="text-gray-500 text-sm mt-1">De quem você compra produtos e materiais. Usados nas entradas de estoque e nos produtos.</p>
      </div>
      <FornecedoresClient fornecedores={resp.itens} total={resp.total} pagina={pagina} limite={limite} q={q} ativo={ativo} />
    </div>
  )
}
