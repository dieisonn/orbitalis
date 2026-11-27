import { api } from '@/lib/api'
import type { Fornecedor, Produto } from '@/lib/suprimentos'
import { lerPaginacao } from '@/lib/paginacao'
import type { RegraMarkup } from './actions'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; categoria?: string; ativo?: string; pagina?: string; limite?: string; ordem?: string; dir?: string }> }) {
  const { q = '', situacao = '', categoria = '', ativo = '', ...pg } = await searchParams
  const { pagina, limite } = lerPaginacao(pg.pagina, pg.limite)
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries({ q, situacao, categoria, ativo })) if (v) qs.set(k, v)
  const qsPag = new URLSearchParams(qs); qsPag.set('pagina', String(pagina)); qsPag.set('limite', String(limite))
  if (pg.ordem) { qsPag.set('ordem', pg.ordem); if (pg.dir) qsPag.set('dir', pg.dir) }
  const [resp, categorias, fornecedores, markup] = await Promise.all([
    api.get<{ itens: Produto[]; total: number }>(`/produtos?${qsPag}`).catch(() => ({ itens: [] as Produto[], total: 0 })),
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
    api.get<Fornecedor[]>('/fornecedores?ativo=true').catch(() => [] as Fornecedor[]),
    api.get<RegraMarkup>('/produtos/markup').catch(() => ({ padrao: 0, categorias: [] }) as RegraMarkup),
  ])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
        <p className="text-gray-500 text-sm mt-1">Peças, gases e materiais com preço de custo, preço de venda e saldo em estoque.</p>
      </div>
      <ProdutosClient produtos={resp.itens} total={resp.total} pagina={pagina} limite={limite} markup={markup} categorias={categorias} fornecedores={fornecedores} filtros={{ q, situacao, categoria, ativo }} />
    </div>
  )
}
