import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { ClipboardList } from 'lucide-react'
import { redirect } from 'next/navigation'

type OrdemServico = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  ambiente: { nome: string; localizacaoInterna: string }
  itens: { id: string; statusItem: string }[]
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente: 'Portal Cliente',
}

export default async function MinhasOsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  let ordens: OrdemServico[] = []
  try {
    ordens = await api.get<OrdemServico[]>(`/ordens-servico/tecnico/${userId}`)
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Minhas Ordens de Serviço</h1>
        <p className="text-gray-500 text-sm mt-1">
          {ordens.length} O.S. ativa(s) atribuída(s) a você
        </p>
      </div>

      {ordens.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <ClipboardList size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma O.S. atribuída no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordens.map((os) => (
            <a
              key={os.id}
              href={`/minhas-os/${os.id}`}
              className="bg-white rounded-2xl p-5 shadow-sm border border-border block hover:bg-surface transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">
                      OS-{os.id.slice(0, 6).toUpperCase()}
                    </span>
                    <StatusBadge status={os.status as 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'} />
                  </div>
                  <p className="font-semibold text-gray-900">{os.ambiente?.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{os.ambiente?.localizacaoInterna}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {ORIGEM_LABEL[os.origem] ?? os.origem}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-1">
                    {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {os.itens?.length ?? 0} equipamento(s)
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
