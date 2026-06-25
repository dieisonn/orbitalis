import { api } from '@/lib/api'
import { Activity, Clock, RefreshCw } from 'lucide-react'

type MetricaEquip = {
  id: string
  nome: string
  marca: string
  tipoEquipamento: string
  cliente: string | null
  ambiente: string | null
  totalCorretivas: number
  ultimaCorretiva: string | null
  mttrHoras: number | null
  mtbfDias: number | null
}

type Config = {
  mttrLimiteHoras: number | null
  mtbfLimiteDias: number | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function semaforo(valor: number | null, limite: number, inverso = false) {
  if (valor === null) return null
  if (inverso) {
    // MTBF: maior é melhor — vermelho quando baixo
    if (valor >= limite) return 'green'
    if (valor >= limite / 2) return 'yellow'
    return 'red'
  } else {
    // MTTR: menor é melhor — vermelho quando alto
    if (valor <= limite / 2) return 'green'
    if (valor <= limite) return 'yellow'
    return 'red'
  }
}

const COR_MTTR: Record<string, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
}
const COR_MTBF: Record<string, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
}

export default async function ConfiabilidadePage() {
  const [metricas, config] = await Promise.all([
    api.get<MetricaEquip[]>('/equipamentos/metricas-confiabilidade').catch(() => [] as MetricaEquip[]),
    api.get<Config>('/configuracao').catch(() => ({ mttrLimiteHoras: null, mtbfLimiteDias: null })),
  ])

  const mttrLimite = config.mttrLimiteHoras ?? 48
  const mtbfLimite = config.mtbfLimiteDias  ?? 90

  // Ordenar: equipamentos com dados primeiro, ordenados por MTTR desc (pior primeiro)
  const ordenados = [...metricas].sort((a, b) => {
    if (a.mttrHoras === null && b.mttrHoras === null) return 0
    if (a.mttrHoras === null) return 1
    if (b.mttrHoras === null) return -1
    return b.mttrHoras - a.mttrHoras
  })

  const comDados   = ordenados.filter((m) => m.totalCorretivas > 0)
  const semDados   = ordenados.filter((m) => m.totalCorretivas === 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Confiabilidade de Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            MTTR e MTBF dos últimos 12 meses · {metricas.length} equipamento(s) · limites: MTTR {mttrLimite}h · MTBF {mtbfLimite}d
          </p>
        </div>
        <a
          href="/configuracoes"
          className="text-xs text-primary font-semibold border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
        >
          Ajustar limites
        </a>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Dentro do limite</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Atenção</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Crítico</span>
        <span className="text-gray-300">·</span>
        <span className="flex items-center gap-1"><Clock size={11} />MTTR: tempo médio de reparo</span>
        <span className="flex items-center gap-1"><RefreshCw size={11} />MTBF: intervalo médio entre falhas (mín. 2 corretivas)</span>
      </div>

      {metricas.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-border">
          <Activity size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400">Nenhum equipamento cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-[28%]">Equipamento</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase w-[20%]">Cliente / Ambiente</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase w-[10%]">Corret.</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase w-[16%]">
                  <span className="flex items-center justify-center gap-1"><Clock size={10} />MTTR</span>
                </th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase w-[16%]">
                  <span className="flex items-center justify-center gap-1"><RefreshCw size={10} />MTBF</span>
                </th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase w-[10%]">Última</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {comDados.map((m) => {
                const corMttr = semaforo(m.mttrHoras, mttrLimite, false)
                const corMtbf = semaforo(m.mtbfDias,  mtbfLimite, true)
                return (
                  <tr key={m.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3 overflow-hidden">
                      <a href={`/equipamentos/${m.id}/historico`} className="font-semibold text-gray-900 hover:text-primary truncate block">
                        {m.nome}
                      </a>
                      <p className="text-xs text-gray-400 truncate">{m.marca} · {m.tipoEquipamento}</p>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 overflow-hidden">
                      <p className="text-xs text-gray-700 truncate">{m.cliente ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{m.ambiente ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-800">{m.totalCorretivas}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.mttrHoras !== null ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COR_MTTR[corMttr!]}`}>
                          {m.mttrHoras < 24
                            ? `${m.mttrHoras}h`
                            : `${(m.mttrHoras / 24).toFixed(1)}d`}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.mtbfDias !== null ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COR_MTBF[corMtbf!]}`}>
                          {m.mtbfDias}d
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs" title="Mínimo 2 corretivas para calcular MTBF">—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500">
                      {fmtDate(m.ultimaCorretiva)}
                    </td>
                  </tr>
                )
              })}

              {/* Equipamentos sem corretivas — agrupados no final */}
              {semDados.length > 0 && (
                <>
                  <tr>
                    <td colSpan={6} className="px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Sem corretivas nos últimos 12 meses ({semDados.length})
                    </td>
                  </tr>
                  {semDados.map((m) => (
                    <tr key={m.id} className="hover:bg-surface/60 opacity-60">
                      <td className="px-4 py-2.5 overflow-hidden">
                        <a href={`/equipamentos/${m.id}/historico`} className="text-sm text-gray-600 hover:text-primary truncate block">
                          {m.nome}
                        </a>
                        <p className="text-xs text-gray-400 truncate">{m.marca} · {m.tipoEquipamento}</p>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-2.5 overflow-hidden">
                        <p className="text-xs text-gray-500 truncate">{m.cliente ?? '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{m.ambiente ?? '—'}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-400">0</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-300">—</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-300">—</td>
                      <td className="hidden md:table-cell px-4 py-2.5 text-xs text-gray-300">—</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
