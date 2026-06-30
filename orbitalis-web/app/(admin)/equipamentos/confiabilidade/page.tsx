import { api } from '@/lib/api'
import { Activity, Clock, RefreshCw, AlertTriangle, DollarSign, Timer } from 'lucide-react'
import { ExportCsvButton } from './export-csv-button'

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
  taxaRetrabalho: number | null
  retrabalhoCount: number
  slaHoras: number | null
}

type Config = {
  mttrLimiteHoras: number | null
  mtbfLimiteDias: number | null
  custoHoraParada: number | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function semaforo(valor: number | null, limite: number, inverso = false) {
  if (valor === null) return null
  if (inverso) {
    if (valor >= limite) return 'green'
    if (valor >= limite / 2) return 'yellow'
    return 'red'
  } else {
    if (valor <= limite / 2) return 'green'
    if (valor <= limite) return 'yellow'
    return 'red'
  }
}

const BADGE: Record<string, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
}

export default async function ConfiabilidadePage() {
  const [metricas, config] = await Promise.all([
    api.get<MetricaEquip[]>('/equipamentos/metricas-confiabilidade').catch(() => [] as MetricaEquip[]),
    api.get<Config>('/configuracao').catch(() => ({ mttrLimiteHoras: null, mtbfLimiteDias: null, custoHoraParada: null })),
  ])

  const mttrLimite  = config.mttrLimiteHoras ?? 48
  const mtbfLimite  = config.mtbfLimiteDias  ?? 90
  const custoPorH   = config.custoHoraParada ? Number(config.custoHoraParada) : null

  const ordenados = [...metricas].sort((a, b) => {
    if (a.mttrHoras === null && b.mttrHoras === null) return 0
    if (a.mttrHoras === null) return 1
    if (b.mttrHoras === null) return -1
    return b.mttrHoras - a.mttrHoras
  })

  const comDados = ordenados.filter((m) => m.totalCorretivas > 0)
  const semDados = ordenados.filter((m) => m.totalCorretivas === 0)

  // Totais para o header
  const totalHorasReparo = metricas.reduce((s, m) => s + (m.mttrHoras ?? 0) * m.totalCorretivas, 0)
  const custoTotal = custoPorH ? totalHorasReparo * custoPorH : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Confiabilidade de Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            MTTR, MTBF e retrabalho dos últimos 12 meses · {metricas.length} equipamento(s) · limites: MTTR {mttrLimite}h · MTBF {mtbfLimite}d
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton metricas={metricas} custoPorH={custoPorH} />
          <a
            href="/configuracoes"
            className="text-xs text-primary font-semibold border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            Ajustar limites
          </a>
        </div>
      </div>

      {/* Cards de resumo */}
      {comDados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400 mb-1">Horas em reparo (total)</p>
            <p className="text-lg font-bold text-gray-900">
              {totalHorasReparo < 24
                ? `${totalHorasReparo.toFixed(0)}h`
                : `${(totalHorasReparo / 24).toFixed(1)}d`}
            </p>
          </div>
          {custoTotal !== null && (
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={10} />Custo estimado</p>
              <p className="text-lg font-bold text-red-600">{fmtBRL(custoTotal)}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400 mb-1">Equipamentos críticos</p>
            <p className="text-lg font-bold text-red-600">
              {comDados.filter((m) => semaforo(m.mttrHoras, mttrLimite) === 'red').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400 mb-1">Com retrabalho</p>
            <p className="text-lg font-bold text-orange-600">
              {comDados.filter((m) => (m.taxaRetrabalho ?? 0) > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Dentro do limite</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Atenção</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Crítico</span>
        <span className="text-gray-300">·</span>
        <span className="flex items-center gap-1"><Clock size={11} />MTTR: tempo médio de reparo</span>
        <span className="flex items-center gap-1"><RefreshCw size={11} />MTBF: intervalo médio entre falhas</span>
        <span className="flex items-center gap-1"><AlertTriangle size={11} />Retrabalho: corretiva ≤30d após preventiva</span>
      </div>

      {metricas.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-border">
          <Activity size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400">Nenhum equipamento cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Equipamento</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Cliente / Ambiente</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">Corret.</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">
                    <span className="flex items-center justify-center gap-1"><Clock size={10} />MTTR</span>
                  </th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">
                    <span className="flex items-center justify-center gap-1"><RefreshCw size={10} />MTBF</span>
                  </th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">
                    <span className="flex items-center justify-center gap-1"><AlertTriangle size={10} />Retrab.</span>
                  </th>
                  <th className="hidden lg:table-cell text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">
                    <span className="flex items-center justify-center gap-1"><Timer size={10} />SLA</span>
                  </th>
                  {custoPorH !== null && (
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase">
                      <span className="flex items-center justify-center gap-1"><DollarSign size={10} />Custo</span>
                    </th>
                  )}
                  <th className="hidden md:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {comDados.map((m) => {
                  const corMttr  = semaforo(m.mttrHoras, mttrLimite, false)
                  const corMtbf  = semaforo(m.mtbfDias,  mtbfLimite, true)
                  const custo    = custoPorH !== null && m.mttrHoras !== null
                    ? custoPorH * m.mttrHoras * m.totalCorretivas
                    : null
                  return (
                    <tr key={m.id} className="hover:bg-surface/60">
                      <td className="px-4 py-3 min-w-[160px]">
                        <a href={`/equipamentos/${m.id}/historico`} className="font-semibold text-gray-900 hover:text-primary block truncate">
                          {m.nome}
                        </a>
                        <p className="text-xs text-gray-400 truncate">{m.marca} · {m.tipoEquipamento}</p>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 min-w-[140px]">
                        <p className="text-xs text-gray-700 truncate">{m.cliente ?? '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{m.ambiente ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-bold text-gray-800">{m.totalCorretivas}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.mttrHoras !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[corMttr!]}`}>
                            {m.mttrHoras < 24 ? `${m.mttrHoras}h` : `${(m.mttrHoras / 24).toFixed(1)}d`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.mtbfDias !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[corMtbf!]}`}>
                            {m.mtbfDias}d
                          </span>
                        ) : <span className="text-gray-300 text-xs" title="Mín. 2 corretivas para MTBF">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.taxaRetrabalho !== null && m.taxaRetrabalho > 0 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {m.taxaRetrabalho}%
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-3 text-center">
                        {m.slaHoras !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.slaHoras <= 4 ? 'bg-green-100 text-green-800' : m.slaHoras <= 24 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {m.slaHoras < 24 ? `${m.slaHoras}h` : `${(m.slaHoras / 24).toFixed(1)}d`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      {custoPorH !== null && (
                        <td className="px-3 py-3 text-center">
                          {custo !== null ? (
                            <span className="text-xs text-gray-700">{fmtBRL(custo)}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      )}
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500">
                        {fmtDate(m.ultimaCorretiva)}
                      </td>
                    </tr>
                  )
                })}

                {/* Equipamentos sem corretivas */}
                {semDados.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={custoPorH !== null ? 9 : 8} className="px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        Sem corretivas nos últimos 12 meses ({semDados.length})
                      </td>
                    </tr>
                    {semDados.map((m) => (
                      <tr key={m.id} className="hover:bg-surface/60 opacity-60">
                        <td className="px-4 py-2.5 min-w-[160px]">
                          <a href={`/equipamentos/${m.id}/historico`} className="text-sm text-gray-600 hover:text-primary block truncate">
                            {m.nome}
                          </a>
                          <p className="text-xs text-gray-400 truncate">{m.marca} · {m.tipoEquipamento}</p>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2.5 min-w-[140px]">
                          <p className="text-xs text-gray-500 truncate">{m.cliente ?? '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{m.ambiente ?? '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-400">0</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-300">—</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-300">—</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-300">—</td>
                        <td className="hidden lg:table-cell px-3 py-2.5 text-center text-xs text-gray-300">—</td>
                        {custoPorH !== null && <td className="px-3 py-2.5 text-center text-xs text-gray-300">—</td>}
                        <td className="hidden md:table-cell px-4 py-2.5 text-xs text-gray-300">—</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
