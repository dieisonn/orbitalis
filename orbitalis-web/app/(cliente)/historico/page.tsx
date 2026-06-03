import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { ClipboardList } from 'lucide-react'

type OrdemServico = {
  id: string
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
  ambiente: { nome: string }
  tecnico: { email: string } | null
  itens: { id: string; statusItem: string }[]
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Admin',
  preventiva_automatica: 'Preventiva',
  portal_cliente:        'Você solicitou',
}

export default async function HistoricoPage() {
  let ordens: OrdemServico[] = []
  try {
    ordens = await api.get<OrdemServico[]>('/ordens-servico/meus')
  } catch {
    // API indisponível
  }

  const pendentes = ordens.filter((o) => ['aberta', 'agendada', 'em_andamento'].includes(o.status))
  const concluidas = ordens.filter((o) => o.status === 'concluida')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Histórico de Manutenções</h1>
        <p className="text-gray-500 text-sm mt-1">
          {ordens.length} O.S. registrada(s) —{' '}
          {pendentes.length} em andamento, {concluidas.length} concluída(s)
        </p>
      </div>

      {ordens.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <ClipboardList size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma ordem de serviço registrada ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Data', 'Ambiente', 'Status', 'Origem', 'Técnico', 'Itens'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {os.ambiente?.nome ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={os.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {ORIGEM_LABEL[os.origem] ?? os.origem}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {os.tecnico?.email ?? <span className="italic">Aguardando</span>}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-600">
                    {os.itens?.length ?? 0}
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
