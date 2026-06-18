import { api } from '@/lib/api'
import { notFound, redirect } from 'next/navigation'
import { EditarOsForm } from './form'

type Props = { params: Promise<{ id: string }> }
type Tecnico = { id: string; email: string; nome: string | null }

export default async function EditarOsPage({ params }: Props) {
  const { id } = await params

  let os: any
  try {
    os = await api.get<any>(`/ordens-servico/${id}`)
  } catch {
    notFound()
  }

  if (!os || os.status === 'concluida' || os.status === 'cancelada') {
    redirect(`/ordens-servico/${id}`)
  }

  const tecnicosRes = await api
    .get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000')
    .catch(() => ({ data: [] as Tecnico[] }))
  const tecnicos = tecnicosRes.data

  const dataAgendamento = os.dataAgendamento
    ? new Date(os.dataAgendamento).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const osNum = os.numero != null
    ? `OS-${String(os.numero).padStart(4, '0')}`
    : `OS-${os.id.slice(0, 6).toUpperCase()}`

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
          <h1 className="text-lg font-semibold text-gray-900 mb-5">Editar {osNum}</h1>
          <EditarOsForm
            osId={id}
            initialValues={{
              dataAgendamento,
              observacoesGerais: os.observacoesGerais ?? null,
              tecnicoId: os.tecnico?.id ?? null,
              tipo: os.tipo ?? 'corretiva',
            }}
            tecnicos={tecnicos}
          />
        </div>
      </div>
    </div>
  )
}
