import { api } from '@/lib/api'
import { EditarEquipamentoForm } from './form'
import { notFound } from 'next/navigation'
import { History } from 'lucide-react'

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
    potencia: string | null
    dataInstalacao: string | null
    condicao: string | null
    diagnosticoInicial: string | null
    valorAquisicao: number | null
  }
  try {
    eq = await api.get(`/equipamentos/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Editar Equipamento</h1>
          <p className="text-gray-500 text-sm mt-1">{eq.nome}</p>
        </div>
        <a
          href={`/equipamentos/${id}/historico`}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <History size={14} />
          Histórico de Custos
        </a>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <EditarEquipamentoForm
          id={eq.id}
          nome={eq.nome}
          marca={eq.marca}
          modelo={eq.modelo}
          numeroSerie={eq.numeroSerie}
          tipoEquipamento={eq.tipoEquipamento}
          potencia={eq.potencia}
          dataInstalacao={eq.dataInstalacao}
          condicao={eq.condicao}
          diagnosticoInicial={eq.diagnosticoInicial}
          valorAquisicao={eq.valorAquisicao}
        />
      </div>
    </div>
  )
}
