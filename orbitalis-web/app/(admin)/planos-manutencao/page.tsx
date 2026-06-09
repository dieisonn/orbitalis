import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletarPlano } from './actions'
import { CalendarClock, CheckCircle, XCircle } from 'lucide-react'

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  ultimaGeracao: string | null
  ambiente: { nome: string }
  tecnico: { email: string } | null
}

export default async function PlanosPage() {
  let planos: Plano[] = []
  try {
    planos = await api.get<Plano[]>('/planos-manutencao')
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Planos Preventivos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Motor Cron executa diariamente às 00:00:01
          </p>
        </div>
        <a
          href="/planos-manutencao/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Novo Plano
        </a>
      </div>

      {planos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <CalendarClock size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Ambiente', 'Técnico', 'Frequência', 'Próxima Geração', 'Última Geração', 'Ativo', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {planos.map((p) => (
                <tr key={p.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {p.ambiente?.nome}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {p.tecnico?.email ?? <span className="italic">Não atribuído</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    A cada {p.frequenciaDias} dia(s)
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(p.proximaGeracao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {p.ultimaGeracao
                      ? new Date(p.ultimaGeracao).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.ativo ? (
                      <CheckCircle size={16} className="text-action" />
                    ) : (
                      <XCircle size={16} className="text-destructive" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/planos-manutencao/${p.id}/editar`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Editar
                      </a>
                      <DeleteButton action={deletarPlano.bind(null, p.id)} />
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
