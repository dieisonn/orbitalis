import { api } from '@/lib/api'
import { MonthSelector } from './month-selector'
import { Users, CheckCircle, AlertTriangle, Clock, Wrench, TrendingUp } from 'lucide-react'

type ProdTecnico = {
  id: string
  nome: string
  email: string
  especialidade: string | null
  totalOs: number
  concluidas: number
  atrasadas: number
  emAberto: number
  taxaConclusao: number
  tempoMedioAtendimentoDias: number | null
  corretivasMes: number
}

type Props = { searchParams: Promise<{ mes?: string; ano?: string }> }

function ScoreBar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function ProdutividadePage({ searchParams }: Props) {
  const { mes: mesP, ano: anoP } = await searchParams
  const agora = new Date()
  const mes = mesP ? parseInt(mesP) : agora.getMonth() + 1
  const ano = anoP ? parseInt(anoP) : agora.getFullYear()

  const tecnicos = await api.get<ProdTecnico[]>(
    `/usuarios/tecnicos/produtividade?mes=${mes}&ano=${ano}`
  ).catch(() => [] as ProdTecnico[])

  const maxConcluidas = tecnicos[0]?.concluidas ?? 1

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Produtividade dos Técnicos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {MESES[mes - 1]}/{ano} · {tecnicos.length} técnico(s) com atividade
          </p>
        </div>
        <MonthSelector mes={mes} ano={ano} />
      </div>

      {tecnicos.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-border">
          <Users size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400">Nenhum técnico com O.S. neste período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tecnicos.map((t, idx) => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-primary/30'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.nome}</p>
                    <p className="text-xs text-gray-400">{t.email}{t.especialidade ? ` · ${t.especialidade}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    t.taxaConclusao >= 80 ? 'bg-green-100 text-green-700' :
                    t.taxaConclusao >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {t.taxaConclusao}% conclusão
                  </span>
                  {t.atrasadas > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      {t.atrasadas} atrasada{t.atrasadas > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <CheckCircle size={10} /> Concluídas
                  </p>
                  <p className="text-2xl font-bold text-green-600">{t.concluidas}</p>
                  <ScoreBar value={t.concluidas} max={maxConcluidas} color="bg-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <TrendingUp size={10} /> Total O.S.
                  </p>
                  <p className="text-2xl font-bold text-gray-800">{t.totalOs}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Clock size={10} /> Em Aberto
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{t.emAberto}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> Atrasadas
                  </p>
                  <p className={`text-2xl font-bold ${t.atrasadas > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                    {t.atrasadas}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Wrench size={10} /> Tempo médio
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {t.tempoMedioAtendimentoDias != null ? `${t.tempoMedioAtendimentoDias}d` : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
