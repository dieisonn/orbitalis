import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { OrcamentoCompleto } from '@/lib/orcamento'
import { OrcamentoForm } from '../../orcamento-form'
import { carregarApoioForm } from '../../carregar-form'

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let orc: OrcamentoCompleto
  try { orc = await api.get<OrcamentoCompleto>(`/orcamentos/${id}`) } catch { notFound() }
  const apoio = await carregarApoioForm()
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Editar orçamento #{String(orc.numero).padStart(4, '0')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {orc.status === 'aprovado' ? 'Orçamento aprovado: ao salvar, a baixa de estoque é ajustada às novas quantidades.' : 'Altere itens, valores e condições de pagamento.'}
        </p>
      </div>
      <OrcamentoForm {...apoio} inicial={orc} />
    </div>
  )
}
