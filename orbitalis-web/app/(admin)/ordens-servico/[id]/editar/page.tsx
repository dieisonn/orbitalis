import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { EditarOsForm } from './form'

type Props = { params: Promise<{ id: string }> }
type Tecnico = { id: string; email: string; nome: string | null }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; localizacaoInterna: string; clienteId: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string; ativo: boolean }
type OsEdicao = {
  id: string; numero: number | null; status: string; dataAgendamento: string | null
  observacoesGerais: string | null; tipo: string | null; horaInicio: string | null; horaFim: string | null
  ambienteId?: string; tipoServicoId?: string | null
  tecnico?: { id: string } | null
  tipoServico?: { id: string } | null
  ambiente?: { id?: string; clienteId?: string; cliente?: { id: string } | null } | null
  itens?: { statusItem: string; observacoesTecnicas: string | null }[]
}

export default async function EditarOsPage({ params }: Props) {
  const { id } = await params

  let os: OsEdicao | null = null
  try {
    os = await api.get<OsEdicao>(`/ordens-servico/${id}`)
  } catch {
    notFound()
  }
  if (!os) notFound()

  const [tecnicosRes, clientesRes, ambientesRes, tiposRes] = await Promise.all([
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Cliente[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as Cliente[] })),
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
  ])

  const dataAgendamento = os.dataAgendamento
    ? new Date(os.dataAgendamento).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const osNum = os.numero != null
    ? `OS-${String(os.numero).padStart(4, '0')}`
    : `OS-${os.id.slice(0, 6).toUpperCase()}`

  // Com itens já executados (ou com observações) não dá para trocar cliente/ambiente
  const localTravado = (os.itens ?? []).some((i) => i.statusItem !== 'pendente' || i.observacoesTecnicas)

  return (
    <div>
      <div className="flex items-center gap-2 mb-8 text-sm">
        <a href="/ordens-servico" className="text-gray-500 hover:text-primary transition-colors">
          Ordens de Serviço
        </a>
        <span className="text-gray-300">/</span>
        <a href={`/ordens-servico/${id}`} className="text-gray-500 hover:text-primary transition-colors">
          {osNum}
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Editar</span>
      </div>

      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-border p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Editar {osNum}</h1>
          {(os.status === 'concluida' || os.status === 'cancelada') && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Esta O.S. está {os.status === 'concluida' ? 'concluída' : 'cancelada'}. As alterações valem normalmente; o status não muda.
            </p>
          )}
          <div className="mb-4" />
          <EditarOsForm
            osId={id}
            initialValues={{
              dataAgendamento,
              observacoesGerais: os.observacoesGerais ?? null,
              tecnicoId: os.tecnico?.id ?? null,
              tipo: os.tipo ?? 'corretiva',
              tipoServicoId: os.tipoServico?.id ?? os.tipoServicoId ?? null,
              horaInicio: os.horaInicio ?? '',
              horaFim: os.horaFim ?? '',
              clienteId: os.ambiente?.cliente?.id ?? os.ambiente?.clienteId ?? '',
              ambienteId: os.ambienteId ?? os.ambiente?.id ?? '',
            }}
            tecnicos={tecnicosRes.data}
            clientes={clientesRes.data}
            ambientes={ambientesRes.data}
            tiposServico={(Array.isArray(tiposRes) ? tiposRes : []).filter((t) => t.ativo || t.id === (os.tipoServico?.id ?? os.tipoServicoId))}
            localTravado={localTravado}
          />
        </div>
      </div>
    </div>
  )
}
