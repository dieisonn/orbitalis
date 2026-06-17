import { api } from '@/lib/api'
import { Bell } from 'lucide-react'
import { AlertaCard } from './alerta-card'
import { AlertaConfigForm } from './alerta-config-form'

type AlertaOcorrencia = {
  id: string
  tipo: string
  severidade: 'info' | 'aviso' | 'critico'
  titulo: string
  descricao: string
  referenciaId: string | null
  resolvido: boolean
  criadoEm: string
  resolvidoEm: string | null
}

type AlertaConfig = {
  osSemAtualizacaoDias: number
  equipamentoCorretivasMes: number
  contratoVencendoDias: number
  planoVencendoDias: number
}

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function AlertasPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const showResolvidos = tab === 'resolvidos'

  const [alertas, config] = await Promise.all([
    api.get<AlertaOcorrencia[]>(`/alertas?resolvido=${showResolvidos}`).catch(() => [] as AlertaOcorrencia[]),
    api.get<AlertaConfig>('/alertas/config').catch(() => null),
  ])

  const ativos = alertas.filter((a) => !a.resolvido)
  const criticos = ativos.filter((a) => a.severidade === 'critico').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={22} />
            Central de Alertas
            {criticos > 0 && (
              <span className="text-sm font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">
                {criticos} crítico{criticos > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {ativos.length} alerta{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 w-fit border border-border">
        <a href="/alertas" className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!showResolvidos ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          Ativos
        </a>
        <a href="/alertas?tab=resolvidos" className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${showResolvidos ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          Resolvidos
        </a>
        <a href="/alertas?tab=config" className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'config' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          Configurar
        </a>
      </div>

      {tab === 'config' ? (
        <AlertaConfigForm config={config} />
      ) : alertas.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-border">
          <Bell size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">
            {showResolvidos ? 'Nenhum alerta resolvido.' : 'Nenhum alerta ativo no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => <AlertaCard key={a.id} alerta={a} />)}
        </div>
      )}
    </div>
  )
}
