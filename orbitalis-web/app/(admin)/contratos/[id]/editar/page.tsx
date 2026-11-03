import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import { EditarContratoForm } from './form'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Contrato = {
  id: string; descricao: string; valorMensal: number | string | null; numOsIncluidas: number | null
  vigenciaInicio: string; vigenciaFim: string; observacoes: string | null
  cliente: Cliente; planos: { id: string }[]
}

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let contrato: Contrato
  try {
    contrato = await api.get<Contrato>(`/contratos/${id}`)
  } catch {
    notFound()
  }
  const res = await api.get<{ data: Cliente[] }>('/clientes?perPage=500').catch(() => ({ data: [] as Cliente[] }))
  // garante que o cliente atual esteja na lista mesmo fora das 500 primeiras
  const clientes = res.data.some((c) => c.id === contrato.cliente.id) ? res.data : [contrato.cliente, ...res.data]

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href={`/contratos/${id}`} className="text-gray-500 hover:text-primary transition-colors">← Contrato</a>
      </div>
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={18} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Editar contrato</h1>
        </div>
        <EditarContratoForm
          contrato={{ ...contrato, clienteId: contrato.cliente.id }}
          clientes={clientes}
          temPlanos={contrato.planos.length > 0}
        />
      </div>
    </div>
  )
}
