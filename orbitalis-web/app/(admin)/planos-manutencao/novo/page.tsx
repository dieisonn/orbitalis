import { api } from '@/lib/api'
import { NovoPlanoForm } from './form'
import type { ContratoOpcao } from '@/components/ui/contrato-select'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  numeroSerie: string | null
}

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  clienteId: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  equipamentos: Equipamento[]
}

type ClienteOpcao = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Tecnico     = { id: string; email: string; nome: string | null }
type Checklist   = { id: string; nome: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

export default async function NovoPlanoPage() {
  const [clientesRes, ambientesRes, tecnicosRes, checklistsRes, tiposRes, contratosRes] = await Promise.all([
    api.get<{ data: ClienteOpcao[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as ClienteOpcao[] })),
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Checklist[] }>('/modelos-checklist?perPage=1000').catch(() => ({ data: [] as Checklist[] })),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
    api.get<ContratoOpcao[]>('/contratos').catch(() => [] as ContratoOpcao[]),
  ])

  const ambientes    = ambientesRes.data
  const tecnicos     = tecnicosRes.data
  const checklists   = checklistsRes.data
  const tiposServico = Array.isArray(tiposRes) ? tiposRes : []
  const contratos    = Array.isArray(contratosRes) ? contratosRes : []

  const temCliente = clientesRes.data.length > 0

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/planos-manutencao" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Planos Preventivos
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Novo Plano Preventivo</h1>
      </div>

      {!temCliente ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border max-w-lg">
          <p className="text-sm text-gray-500">
            Nenhum cliente cadastrado.{' '}
            <a href="/clientes/novo" className="text-primary font-semibold hover:underline">
              Crie um cliente primeiro.
            </a>
          </p>
        </div>
      ) : (
        <NovoPlanoForm clientes={clientesRes.data} ambientes={ambientes} tecnicos={tecnicos} checklists={checklists} tiposServico={tiposServico} contratos={contratos} />
      )}
    </div>
  )
}
