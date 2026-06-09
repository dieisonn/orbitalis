import { api } from '@/lib/api'
import { EditarEquipamentoForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarEquipamentoPage({ params }: Props) {
  const { id } = await params

  let eq: {
    id: string
    nome: string
    marca: string
    modelo: string | null
    numeroSerie: string | null
    tipoEquipamento: string
  }
  try {
    eq = await api.get(`/equipamentos/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Equipamento</h1>
        <p className="text-gray-500 text-sm mt-1">{eq.nome}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarEquipamentoForm
          id={eq.id}
          nome={eq.nome}
          marca={eq.marca}
          modelo={eq.modelo}
          numeroSerie={eq.numeroSerie}
          tipoEquipamento={eq.tipoEquipamento}
        />
      </div>
    </div>
  )
}
