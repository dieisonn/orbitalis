import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletarUsuario } from './actions'
import { UserCog } from 'lucide-react'

type Tecnico = {
  id: string
  email: string
  dataCriacao: string
}

export default async function UsuariosPage() {
  let tecnicos: Tecnico[] = []
  try {
    tecnicos = await api.get<Tecnico[]>('/usuarios/tecnicos')
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Técnicos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tecnicos.length} técnico(s) cadastrado(s)
          </p>
        </div>
        <a
          href="/usuarios/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Novo Técnico
        </a>
      </div>

      {tecnicos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <UserCog size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum técnico cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  E-mail
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Cadastrado em
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tecnicos.map((t) => (
                <tr key={t.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{t.email}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {t.dataCriacao
                      ? new Date(t.dataCriacao).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/usuarios/${t.id}/editar`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Editar
                      </a>
                      <DeleteButton action={deletarUsuario.bind(null, t.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
