import { api } from '@/lib/api'
import { EditarClienteForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params

  let cliente: { id: string; razaoSocial: string; nomeFantasia: string | null; endereco: string; telefone: string | null }
  try {
    cliente = await api.get(`/clientes/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Cliente</h1>
        <p className="text-gray-500 text-sm mt-1">{cliente.razaoSocial}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarClienteForm
          id={cliente.id}
          razaoSocial={cliente.razaoSocial}
          nomeFantasia={cliente.nomeFantasia}
          endereco={cliente.endereco}
          telefone={cliente.telefone}
        />
      </div>
    </div>
  )
}
