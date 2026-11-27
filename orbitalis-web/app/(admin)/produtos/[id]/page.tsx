import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { Fornecedor, Produto } from '@/lib/suprimentos'
import type { RegraMarkup } from '../actions'
import { ProdutoForm } from '../produto-form'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const produto = await api.get<Produto>(`/produtos/${id}`).catch(() => null)
  if (!produto) notFound()
  const [categorias, fornecedores, markup] = await Promise.all([
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
    api.get<Fornecedor[]>('/fornecedores?ativo=true').catch(() => [] as Fornecedor[]),
    api.get<RegraMarkup>('/produtos/markup').catch(() => ({ padrao: 0, categorias: [] }) as RegraMarkup),
  ])
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Editar produto</h1><p className="text-gray-500 text-sm mt-1">{produto.nome}</p></div>
      <ProdutoForm key={produto.id} produto={produto} categorias={categorias} fornecedores={fornecedores} markup={markup} />
    </div>
  )
}
