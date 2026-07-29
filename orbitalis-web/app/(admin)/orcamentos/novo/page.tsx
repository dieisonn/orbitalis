import { api } from '@/lib/api'
import { NovoOrcamentoForm } from './form'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export default async function NovoOrcamentoPage() {
  const clientes = await api.get<Cliente[]>('/clientes').catch(() => [])
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Novo Orçamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Crie uma proposta comercial para enviar ao cliente</p>
      </div>
      <NovoOrcamentoForm clientes={clientes} />
    </div>
  )
}
