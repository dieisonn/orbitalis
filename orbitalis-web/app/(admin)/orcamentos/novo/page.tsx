import { api } from '@/lib/api'
import { numeroOs } from '@/lib/os-numero'
import { OrcamentoForm } from '../orcamento-form'
import { carregarApoioForm } from '../carregar-form'

type VisitaOs = {
  id: string; numero: number | null; dataConclusao: string | null; ambienteId: string
  ambiente: { cliente: { id: string } }
  tipoServico: { sigla: string; ehVisita?: boolean } | null
}

export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<{ visita?: string }> }) {
  const { visita: visitaId } = await searchParams
  const apoio = await carregarApoioForm()

  // "Gerar orçamento" a partir de uma visita: já vem com cliente, ambiente e a visita de origem
  let prefill: { clienteId: string; ambienteId: string; visitaOrigemId: string; titulo: string } | undefined
  let visitas = apoio.visitas
  if (visitaId) {
    const v = await api.get<VisitaOs>(`/ordens-servico/${visitaId}`).catch(() => null)
    if (v?.tipoServico?.ehVisita) {
      const clienteId = v.ambiente.cliente.id
      prefill = { clienteId, ambienteId: v.ambienteId, visitaOrigemId: v.id, titulo: `Orçamento da visita ${numeroOs(v)}` }
      if (!visitas.some((x) => x.id === v.id)) {
        visitas = [{ id: v.id, clienteId, numero: v.numero, sigla: v.tipoServico.sigla, dataConclusao: v.dataConclusao }, ...visitas]
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Novo Orçamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {prefill ? 'Gerado a partir da visita: cliente, ambiente e origem já estão preenchidos.' : 'Crie uma proposta comercial para enviar ao cliente'}
        </p>
      </div>
      <OrcamentoForm {...apoio} visitas={visitas} prefill={prefill} />
    </div>
  )
}
