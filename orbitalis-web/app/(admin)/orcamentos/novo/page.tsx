import { OrcamentoForm } from '../orcamento-form'
import { carregarApoioForm } from '../carregar-form'

export default async function NovoOrcamentoPage() {
  const apoio = await carregarApoioForm()
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Novo Orçamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Crie uma proposta comercial para enviar ao cliente</p>
      </div>
      <OrcamentoForm {...apoio} />
    </div>
  )
}
