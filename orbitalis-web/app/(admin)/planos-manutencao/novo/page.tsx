import { api } from '@/lib/api'
import { NovoPlanoForm } from './form'

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

type Tecnico   = { id: string; email: string; nome: string | null }
type Checklist = { id: string; nome: string }

export default async function NovoPlanoPage() {
  const [ambientesRes, tecnicosRes, checklistsRes] = await Promise.all([
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Checklist[] }>('/modelos-checklist?perPage=1000').catch(() => ({ data: [] as Checklist[] })),
  ])

  const ambientes  = ambientesRes.data
  const tecnicos   = tecnicosRes.data
  const checklists = checklistsRes.data

  const temCliente = ambientes.some((a) => a.cliente)

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/planos-manutencao" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Planos Preventivos
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Novo Plano Preventivo</h1>
      </div>

      {!temCliente ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border max-w-lg">
          <p className="text-sm text-gray-500">
            Nenhum ambiente cadastrado.{' '}
            <a href="/ambientes/novo" className="text-primary font-semibold hover:underline">
              Crie um ambiente primeiro.
            </a>
          </p>
        </div>
      ) : (
        <NovoPlanoForm ambientes={ambientes} tecnicos={tecnicos} checklists={checklists} />
      )}
    </div>
  )
}
