import { api } from '@/lib/api'
import { EditarAmbienteForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarAmbientePage({ params }: Props) {
  const { id } = await params

  let ambiente: {
    id: string
    nome: string
    metrosQuadrados: number
    capacidadeTermica: string
    localizacaoInterna: string
  }
  try {
    ambiente = await api.get(`/ambientes/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Ambiente</h1>
        <p className="text-gray-500 text-sm mt-1">{ambiente.nome}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarAmbienteForm
          id={ambiente.id}
          nome={ambiente.nome}
          metrosQuadrados={ambiente.metrosQuadrados}
          capacidadeTermica={ambiente.capacidadeTermica}
          localizacaoInterna={ambiente.localizacaoInterna}
        />
      </div>
    </div>
  )
}
