import { api } from '@/lib/api'
import { EditarPlanoForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  tecnico: { id: string; email: string } | null
  ambiente: { nome: string }
}

type Tecnico = { id: string; email: string }

export default async function EditarPlanoPage({ params }: Props) {
  const { id } = await params

  let plano: Plano
  let tecnicos: Tecnico[] = []
  try {
    const [planoData, tecnicosRes] = await Promise.all([
      api.get<Plano>(`/planos-manutencao/${id}`),
      api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000'),
    ])
    plano = planoData
    tecnicos = tecnicosRes.data
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Plano Preventivo</h1>
        <p className="text-gray-500 text-sm mt-1">{plano.ambiente?.nome}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarPlanoForm
          id={plano.id}
          tecnicoId={plano.tecnico?.id ?? null}
          frequenciaDias={plano.frequenciaDias}
          proximaGeracao={plano.proximaGeracao}
          ativo={plano.ativo}
          tecnicos={tecnicos}
        />
      </div>
    </div>
  )
}
