import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarUsuario } from './actions'
import { UserCog, Phone, Wrench } from 'lucide-react'

type Tecnico = {
  id: string
  email: string
  nome: string | null
  telefone: string | null
  especialidade: string | null
  dataCriacao: string
}

type ApiResponse = { data: Tecnico[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function UsuariosPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/usuarios/tecnicos?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const tecnicos = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Técnicos</h1>
          <p className="text-gray-500 text-sm mt-1">{result.total} técnico(s) cadastrado(s)</p>
        </div>
        <a href="/usuarios/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          + Novo Técnico
        </a>
      </div>

      {tecnicos.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <UserCog size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum técnico cadastrado ainda.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tecnicos.map((t) => (
              <div key={t.id} className="bg-white rounded-xl p-5 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{t.nome ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
                  </div>
                  <UserCog size={16} className="text-primary/30 mt-1" />
                </div>
                <div className="space-y-1 mb-4">
                  {t.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone size={11} className="text-primary/50" />{t.telefone}
                    </div>
                  )}
                  {t.especialidade && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Wrench size={11} className="text-primary/50" />{t.especialidade}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[10px] text-gray-400">
                    {t.dataCriacao ? new Date(t.dataCriacao).toLocaleDateString('pt-BR') : '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    <a href={`/usuarios/${t.id}/editar`} className="text-xs font-semibold text-primary hover:underline">Editar</a>
                    <DeleteButton action={deletarUsuario.bind(null, t.id)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {result.total > result.perPage && (
            <div className="mt-4 bg-white rounded-xl border border-border overflow-hidden">
              <Suspense>
                <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/usuarios" />
              </Suspense>
            </div>
          )}
        </>
      )}
    </div>
  )
}
