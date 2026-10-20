import { api } from '@/lib/api'
import { NovoOrcamentoForm } from './form'
import type { ModeloResumo } from '@/lib/checklist'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; clienteId: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string; ativo: boolean }

export default async function NovoOrcamentoPage() {
  // A API devolve listas paginadas ({ data }); pede tudo de uma vez
  const [clientesRes, ambientesRes, tiposServico, modelosRes] = await Promise.all([
    api.get<{ data: Cliente[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as Cliente[] })),
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
    api.get<{ data: ModeloResumo[] }>('/modelos-checklist?perPage=500').catch(() => ({ data: [] as ModeloResumo[] })),
  ])
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Novo Orçamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Crie uma proposta comercial para enviar ao cliente</p>
      </div>
      <NovoOrcamentoForm
        clientes={clientesRes.data}
        ambientes={ambientesRes.data}
        tiposServico={tiposServico.filter((t) => t.ativo)}
        modelos={modelosRes.data}
      />
    </div>
  )
}
