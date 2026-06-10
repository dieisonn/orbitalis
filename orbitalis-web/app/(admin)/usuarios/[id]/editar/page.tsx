import { api } from '@/lib/api'
import { EditarTecnicoForm } from './form'
import { notFound } from 'next/navigation'

type Tecnico = { id: string; email: string; nome: string | null; telefone: string | null; especialidade: string | null }
type Props = { params: Promise<{ id: string }> }

export default async function EditarTecnicoPage({ params }: Props) {
  const { id } = await params
  let tecnico: Tecnico
  try {
    tecnico = await api.get<Tecnico>(`/usuarios/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Técnico</h1>
        <p className="text-gray-500 text-sm mt-1">{tecnico.nome ?? tecnico.email}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarTecnicoForm
          id={tecnico.id}
          email={tecnico.email}
          nome={tecnico.nome}
          telefone={tecnico.telefone}
          especialidade={tecnico.especialidade}
        />
      </div>
    </div>
  )
}
