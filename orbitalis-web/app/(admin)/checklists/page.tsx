import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletarChecklist } from './actions'
import { ClipboardCheck, Pencil } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean }
type Modelo = { id: string; nome: string; itens: ChecklistItem[] }

export default async function ChecklistsPage() {
  let modelos: Modelo[] = []
  try {
    modelos = await api.get<Modelo[]>('/modelos-checklist')
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Checklists PMOC</h1>
          <p className="text-gray-500 text-sm mt-1">
            Templates de itens de manutenção usados nas O.S.
          </p>
        </div>
        <a
          href="/checklists/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Novo Checklist
        </a>
      </div>

      {modelos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <ClipboardCheck size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum checklist criado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">
            Crie um template para que as O.S. gerem itens de manutenção automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modelos.map((m) => {
            const itens = Array.isArray(m.itens) ? m.itens : []
            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{m.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{itens.length} item(ns)</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded-lg">
                    PMOC
                  </span>
                </div>

                {itens.length > 0 && (
                  <ul className="space-y-1 mb-4 max-h-40 overflow-y-auto">
                    {itens.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.obrigatorio ? 'bg-destructive' : 'bg-gray-300'}`} />
                        {item.descricao}
                        {item.obrigatorio && (
                          <span className="text-[9px] text-destructive font-semibold uppercase">obrig.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <a
                    href={`/checklists/${m.id}/editar`}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <Pencil size={12} />
                    Editar
                  </a>
                  <DeleteButton action={deletarChecklist.bind(null, m.id)} label="Excluir" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
