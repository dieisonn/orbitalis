import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarChecklist, importarPmocSplitHiwall, importarAnvisa } from './actions'
import { ClipboardCheck, Pencil, Download } from 'lucide-react'

type TipoItem = 'texto' | 'numero' | 'escolha_unica' | 'multipla_escolha'
type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean; tipo?: TipoItem; unidade?: string; opcoes?: string[] }
type Modelo = { id: string; nome: string; itens: ChecklistItem[] }

const TIPO_LABELS: Record<TipoItem, string> = {
  texto:            'Texto',
  numero:           'Número',
  escolha_unica:    'Escolha única',
  multipla_escolha: 'Múltipla',
}
type ApiResponse = { data: Modelo[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function ChecklistsPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/modelos-checklist?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const modelos = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Checklists PMOC</h1>
          <p className="text-gray-500 text-sm mt-1">Templates de itens de manutenção usados nas O.S.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <form action={importarPmocSplitHiwall}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary text-sm font-semibold rounded-lg border border-primary hover:bg-primary/5 transition-colors"
              title="Importar checklist padrão PMOC Split Hi-Wall (ABRAVA)"
            >
              <Download size={14} />
              PMOC Split Hi-Wall
            </button>
          </form>
          <form action={importarAnvisa}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary text-sm font-semibold rounded-lg border border-primary hover:bg-primary/5 transition-colors"
              title="Importar checklist padrão ANVISA — Climatização em Serviços de Saúde (RDC 09/2003)"
            >
              <Download size={14} />
              ANVISA (RDC 09/2003)
            </button>
          </form>
          <a href="/checklists/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
            + Novo Checklist
          </a>
        </div>
      </div>

      {modelos.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <ClipboardCheck size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum checklist criado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">Use o botão "PMOC Split Hi-Wall (ABRAVA)" para importar o checklist padrão.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modelos.map((m) => {
              const itens = Array.isArray(m.itens) ? m.itens : []
              return (
                <div key={m.id} className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{m.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{itens.length} item(ns)</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded-lg">PMOC</span>
                  </div>

                  {itens.length > 0 && (
                    <ul className="space-y-1.5 mb-4 max-h-44 overflow-y-auto">
                      {itens.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.obrigatorio ? 'bg-destructive' : 'bg-gray-300'}`} />
                          <span className="flex-1 truncate">{item.descricao}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded font-medium shrink-0">
                            {TIPO_LABELS[item.tipo ?? 'texto']}
                          </span>
                          {item.tipo === 'numero' && item.unidade && (
                            <span className="text-[9px] text-gray-400 shrink-0">{item.unidade}</span>
                          )}
                          {item.obrigatorio && <span className="text-[9px] text-destructive font-semibold uppercase shrink-0">obrig.</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <a href={`/checklists/${m.id}/editar`} className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                      <Pencil size={12} />Editar
                    </a>
                    <DeleteButton action={deletarChecklist.bind(null, m.id)} label="Excluir" />
                  </div>
                </div>
              )
            })}
          </div>
          {result.total > result.perPage && (
            <div className="mt-4 bg-white rounded-xl border border-border overflow-hidden">
              <Suspense>
                <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/checklists" />
              </Suspense>
            </div>
          )}
        </>
      )}
    </div>
  )
}
