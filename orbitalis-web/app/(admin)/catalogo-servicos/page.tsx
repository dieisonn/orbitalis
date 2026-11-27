import { api } from '@/lib/api'
import type { ServicoCatalogo } from '@/lib/suprimentos'
import { lerPaginacao } from '@/lib/paginacao'
import { ServicosCatalogoClient } from './servicos-client'

type TipoServico = { id: string; sigla: string; nome: string; ativo: boolean }

export default async function CatalogoServicosPage({ searchParams }: { searchParams: Promise<{ q?: string; ativo?: string; pagina?: string; limite?: string }> }) {
  const { q = '', ativo = '', ...pg } = await searchParams
  const { pagina, limite } = lerPaginacao(pg.pagina, pg.limite)
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (ativo) qs.set('ativo', ativo)
  qs.set('pagina', String(pagina)); qs.set('limite', String(limite))
  const [resp, tipos] = await Promise.all([
    api.get<{ itens: ServicoCatalogo[]; total: number }>(`/catalogo-servicos?${qs}`).catch(() => ({ itens: [] as ServicoCatalogo[], total: 0 })),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
  ])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Catálogo de serviços</h1>
        <p className="text-gray-500 text-sm mt-1">Serviços com valor padrão para montar orçamentos (ex.: Limpeza de split 12.000 BTUs). Diferente dos “Tipos de serviço”, que definem cor e duração na agenda.</p>
      </div>
      <ServicosCatalogoClient servicos={resp.itens} total={resp.total} pagina={pagina} limite={limite} tipos={tipos.filter((t) => t.ativo)} q={q} ativo={ativo} />
    </div>
  )
}
