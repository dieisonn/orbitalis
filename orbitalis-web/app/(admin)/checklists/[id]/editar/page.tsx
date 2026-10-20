import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { ChecklistEditor } from '@/components/ui/checklist-editor'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean }
type Modelo = {
  id: string; nome: string; itens: ChecklistItem[]
  tipo: 'preventiva' | 'corretiva' | null; tipoServicoId: string | null
}

export default async function EditarChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let modelo: Modelo | null = null
  try {
    modelo = await api.get<Modelo>(`/modelos-checklist/${id}`)
  } catch {
    notFound()
  }

  if (!modelo) notFound()

  const itens = Array.isArray(modelo.itens) ? modelo.itens : []
  const tiposServico = await api
    .get<{ id: string; sigla: string; nome: string; ativo: boolean }[]>('/tipos-servico')
    .then((r) => r.filter((t) => t.ativo || t.id === modelo!.tipoServicoId))
    .catch(() => [])

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Editar Checklist</h1>
        <p className="text-gray-500 text-sm mt-1">{modelo.nome}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <ChecklistEditor
          checklistId={id}
          initialNome={modelo.nome}
          initialItens={itens}
          initialTipo={modelo.tipo}
          initialTipoServicoId={modelo.tipoServicoId}
          tiposServico={tiposServico}
        />
      </div>
    </div>
  )
}
