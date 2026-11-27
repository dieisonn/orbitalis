import Link from 'next/link'
import { api } from '@/lib/api'
import type { RegraMarkup } from '../actions'
import { MarkupClient } from './markup-client'

export default async function MarkupPage() {
  const [regra, categorias] = await Promise.all([
    api.get<RegraMarkup>('/produtos/markup').catch(() => ({ padrao: 0, categorias: [] }) as RegraMarkup),
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
  ])
  return (
    <div>
      <div className="mb-6">
        <Link href="/produtos" className="text-sm text-primary hover:underline">← Produtos</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Markup padrão</h1>
        <p className="text-gray-500 text-sm mt-1">Percentual somado ao custo final para formar o preço de venda. Usado ao calcular preços (no cadastro e em lote na lista de produtos).</p>
      </div>
      <MarkupClient inicial={regra} categorias={categorias} />
    </div>
  )
}
