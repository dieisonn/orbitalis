'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { CheckCircle, AlertTriangle, XCircle, Activity, Gauge, Zap } from 'lucide-react'

interface Kpi { media: number; min: number; max: number }
interface Anomalia { nivel: 'normal' | 'atencao' | 'critico'; parametro: string; valor: string; mensagem: string }
interface SerieIdu { time: string; scsh: number | null; pipeIn: number | null; pipeOut: number | null; air: number | null }
interface SerieOdu { time: string; highPress: number | null; lowPress: number | null; power: number | null; freq: number | null }

interface Relatorio {
  status: 'normal' | 'atencao' | 'critico'
  modo: string
  duracao: string
  totalLeituras: number
  errosEncontrados: string[]
  kpis: {
    superaquecimento?: Kpi
    pressaoAlta?: Kpi
    pressaoBaixa?: Kpi
    tempDescarga?: Kpi
    tempEvaporacao?: Kpi
    tempCondensacao?: Kpi
    consumo?: Kpi
    freqCompressor?: Kpi
    deltaT?: { media: number }
  }
  anomalias: Anomalia[]
  laudo: string
  seriesIdu: SerieIdu[]
  seriesOdu: SerieOdu[]
}

interface Props {
  relatorio: Relatorio
  equipamentoNome: string
  criadoEm: string
  arquivoIduNome: string | null
  arquivoOduNome: string | null
}

const STATUS_CONFIG = {
  normal:  { label: 'Normal',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle,    iconCls: 'text-emerald-500' },
  atencao: { label: 'Atenção',   cls: 'bg-yellow-100  text-yellow-700  border-yellow-200',  Icon: AlertTriangle,  iconCls: 'text-yellow-500'  },
  critico: { label: 'Crítico',   cls: 'bg-red-100     text-red-700     border-red-200',     Icon: XCircle,        iconCls: 'text-red-500'     },
}

const NIVEL_ICON = {
  normal:  { Icon: CheckCircle,  cls: 'text-emerald-500' },
  atencao: { Icon: AlertTriangle, cls: 'text-yellow-500' },
  critico: { Icon: XCircle,       cls: 'text-red-500'    },
}

function KpiCard({ label, kpi, unit }: { label: string; kpi?: Kpi; unit: string }) {
  if (!kpi) return null
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{kpi.media}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span></p>
      <p className="text-xs text-gray-400 mt-1">mín {kpi.min} · máx {kpi.max}</p>
    </div>
  )
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

export function RelatorioView({ relatorio: r, equipamentoNome, criadoEm, arquivoIduNome, arquivoOduNome }: Props) {
  const statusCfg = STATUS_CONFIG[r.status]
  const StatusIcon = statusCfg.Icon

  const iduSamples = downsample(r.seriesIdu, 120)
  const oduSamples = downsample(r.seriesOdu, 120)

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Activity size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">Diagnóstico LGMV</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                <StatusIcon size={12} />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{equipamentoNome}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(criadoEm).toLocaleString('pt-BR')} · Modo: {r.modo} · Duração: {r.duracao} · {r.totalLeituras} leituras
            </p>
            {(arquivoIduNome || arquivoOduNome) && (
              <p className="text-xs text-gray-300 mt-0.5">
                {[arquivoIduNome, arquivoOduNome].filter(Boolean).join(' + ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Laudo */}
      <div className={`rounded-2xl border p-5 ${statusCfg.cls}`}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">Laudo Técnico</p>
        <p className="text-sm leading-relaxed">{r.laudo}</p>
      </div>

      {/* KPI Grid */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Gauge size={14} /> Parâmetros de Operação
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Superaquecimento" kpi={r.kpis.superaquecimento} unit="°C" />
          <KpiCard label="Pressão de Sucção" kpi={r.kpis.pressaoBaixa} unit="psi" />
          <KpiCard label="Pressão de Descarga" kpi={r.kpis.pressaoAlta} unit="psi" />
          <KpiCard label="Temp. Descarga" kpi={r.kpis.tempDescarga} unit="°C" />
          <KpiCard label="Temp. Evaporação" kpi={r.kpis.tempEvaporacao} unit="°C" />
          <KpiCard label="Temp. Condensação" kpi={r.kpis.tempCondensacao} unit="°C" />
          <KpiCard label="Consumo Elétrico" kpi={r.kpis.consumo} unit="kW" />
          <KpiCard label="Freq. Compressor" kpi={r.kpis.freqCompressor} unit="Hz" />
        </div>
      </div>

      {/* Anomalias */}
      {r.anomalias.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Análise de Parâmetros</h2>
          <div className="space-y-2">
            {r.anomalias.map((a, i) => {
              const { Icon, cls } = NIVEL_ICON[a.nivel]
              return (
                <div key={i} className="bg-white rounded-xl border border-border px-4 py-3 flex items-start gap-3">
                  <Icon size={16} className={`${cls} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{a.parametro}</span>
                      <span className="text-xs font-mono text-gray-500">{a.valor}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{a.mensagem}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chart: Pressões */}
      {oduSamples.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Gauge size={14} /> Pressões de Operação (psi)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oduSamples}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number | string) => `${v} psi`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="highPress" name="Alta" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="lowPress"  name="Sucção" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: SH/SC */}
      {iduSamples.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={14} /> Superaquecimento / Sub-resfriamento (°C)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={iduSamples}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number | string) => `${v}°C`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="scsh"    name="SH/SC"         stroke="#8b5cf6" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="pipeIn"  name="Tubo Entrada"  stroke="#0ea5e9" strokeWidth={1}   dot={false} connectNulls />
              <Line type="monotone" dataKey="pipeOut" name="Tubo Saída"    stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: Consumo e frequência */}
      {oduSamples.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Zap size={14} /> Consumo (kW) e Frequência do Compressor (Hz)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oduSamples}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left"  type="monotone" dataKey="power" name="Consumo (kW)" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="freq"  name="Freq. (Hz)"   stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Erros */}
      {r.errosEncontrados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
            <XCircle size={14} /> Códigos de Erro Registrados
          </h2>
          <ul className="space-y-1">
            {r.errosEncontrados.map((e, i) => (
              <li key={i} className="text-xs text-red-600 font-mono">{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
