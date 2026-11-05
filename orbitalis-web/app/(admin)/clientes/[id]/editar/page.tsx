import { api } from '@/lib/api'
import { EditarClienteForm } from './form'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params

  let cliente: {
    id: string; documento: string | null; razaoSocial: string; nomeFantasia: string | null; endereco: string; enderecosExtras?: { id: string; rotulo: string; endereco: string }[]
    telefone: string | null; celular: string | null; email: string | null; cidade: string | null; uf: string | null
  }
  try {
    cliente = await api.get(`/clientes/${id}`)
  } catch {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/clientes" className="text-sm text-gray-500 hover:text-primary transition-colors">← Clientes</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Editar Cliente</h1>
        <span className="text-sm text-gray-500">· {cliente.razaoSocial}</span>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-border p-6">
        <EditarClienteForm
          id={cliente.id}
          documento={cliente.documento}
          celular={cliente.celular}
          email={cliente.email}
          cidade={cliente.cidade}
          uf={cliente.uf}
          razaoSocial={cliente.razaoSocial}
          nomeFantasia={cliente.nomeFantasia}
          endereco={cliente.endereco}
          enderecosExtras={cliente.enderecosExtras ?? []}
          telefone={cliente.telefone}
        />
        </div>
      </div>
    </div>
  )
}
