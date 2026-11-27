import { api } from '@/lib/api'
import type { Fornecedor } from '@/lib/suprimentos'
import { ProdutoForm } from '../produto-form'

export default async function NovoProdutoPage() {
  const [categorias, fornecedores] = await Promise.all([
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
    api.get<Fornecedor[]>('/fornecedores?ativo=true').catch(() => [] as Fornecedor[]),
  ])
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Adicionar produto</h1><p className="text-gray-500 text-sm mt-1">Preencha as abas e clique em Cadastrar.</p></div>
      <ProdutoForm categorias={categorias} fornecedores={fornecedores} />
    </div>
  )
}
