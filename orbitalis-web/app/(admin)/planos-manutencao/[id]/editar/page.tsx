import { api } from '@/lib/api'
import { EditarPlanoForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

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

type EquipConfig = {
  equipamentoId: string
  modeloChecklistId: string | null
  equipamento: { id: string; nome: string; tipoEquipamento: string; ambienteId: string }
  modeloChecklist: { id: string; nome: string } | null
}

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  dataFim: string | null
  tipoServicoId: string | null
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  tecnico: { id: string; email: string; nome: string | null } | null
  equipamentosConfig: EquipConfig[]
}

type Tecnico     = { id: string; email: string; nome: string | null }
type Checklist   = { id: string; nome: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

export default async function EditarPlanoPage({ params }: Props) {
  const { id } = await params

  let plano: Plano
  let tecnicos: Tecnico[]     = []
  let checklists: Checklist[] = []
  let ambientes: Ambiente[]   = []
  let tiposServico: TipoServico[] = []

  try {
    const [planoData, tecnicosRes, checklistsRes, tiposRes] = await Promise.all([
      api.get<Plano>(`/planos-manutencao/${id}`),
      api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000'),
      api.get<{ data: Checklist[] }>('/modelos-checklist?perPage=1000'),
      api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
    ])
    plano        = planoData
    tecnicos     = tecnicosRes.data
    checklists   = checklistsRes.data
    tiposServico = Array.isArray(tiposRes) ? tiposRes : []

    // Carrega todos os ambientes do cliente para permitir adicionar/remover equipamentos
    const ambRes = await api.get<{ data: Ambiente[] }>(`/ambientes?clienteId=${plano.cliente.id}&perPage=1000`)
    ambientes = ambRes.data
  } catch {
    notFound()
  }

  const clienteLabel = plano.cliente?.nomeFantasia ?? plano.cliente?.razaoSocial ?? '—'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-8">
        <a href={`/planos-manutencao/${id}`} className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← {clienteLabel}
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Editar Plano Preventivo</h1>
      </div>

      <EditarPlanoForm
        id={plano.id}
        clienteLabel={clienteLabel}
        tecnicoId={plano.tecnico?.id ?? null}
        tipoServicoId={plano.tipoServicoId ?? null}
        frequenciaDias={plano.frequenciaDias}
        proximaGeracao={plano.proximaGeracao}
        dataFim={plano.dataFim}
        ativo={plano.ativo}
        equipamentosConfigAtual={plano.equipamentosConfig}
        ambientes={ambientes}
        tecnicos={tecnicos}
        checklists={checklists}
        tiposServico={tiposServico}
      />
    </div>
  )
}
