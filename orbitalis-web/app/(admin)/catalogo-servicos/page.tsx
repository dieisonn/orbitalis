import { api } from '@/lib/api'
import type { ServicoCatalogo } from '@/lib/suprimentos'
import { ServicosCatalogoClient } from './servicos-client'

type TipoServico = { id: string; sigla: string; nome: string; ativo: boolean }

export default async function CatalogoServicosPage({ searchParams }: { searchParams: Promise<{ q?: string; ativo?: string }> }) {
  const { q = '', ativo = '' } = await searchParams
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (ativo) qs.set('ativo', ativo)
  const [servicos, tipos] = await Promise.all([
    api.get<ServicoCatalogo[]>(`/catalogo-servicos?${qs}`).catch(() => [] as ServicoCatalogo[]),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
  ])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Catálogo de serviços</h1>
        <p className="text-gray-500 text-sm mt-1">Serviços com valor padrão para montar orçamentos (ex.: Limpeza de split 12.000 BTUs). Diferente dos “Tipos de serviço”, que definem cor e duração na agenda.</p>
      </div>
      <ServicosCatalogoClient servicos={servicos} tipos={tipos.filter((t) => t.ativo)} q={q} ativo={ativo} />
    </div>
  )
}
