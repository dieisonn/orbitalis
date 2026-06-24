'use client'

import { useState, useTransition } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { CheckCircle, AlertTriangle, XCircle, Activity, Gauge, Zap, Printer, Calendar, Pencil, Check, X } from 'lucide-react'
import { atualizarDataInspecao } from '@/app/(admin)/equipamentos/[id]/diagnosticos/actions'

interface Kpi { media: number; min: number; max: number }
interface Anomalia { nivel: 'normal' | 'atencao' | 'critico'; parametro: string; valor: string; mensagem: string }
interface SerieIdu { time: string; scsh: number | null; pipeIn: number | null; pipeOut: number | null; air: number | null }
interface SerieOdu { time: string; highPress: number | null; lowPress: number | null; power: number | null; freq: number | null }

interface Relatorio {
  status: 'normal' | 'atencao' | 'critico'
  modo: string; duracao: string; totalLeituras: number
  errosEncontrados: string[]
  kpis: {
    superaquecimento?: Kpi; pressaoAlta?: Kpi; pressaoBaixa?: Kpi
    tempDescarga?: Kpi; tempEvaporacao?: Kpi; tempCondensacao?: Kpi
    consumo?: Kpi; freqCompressor?: Kpi
  }
  anomalias: Anomalia[]
  laudo: string
  seriesIdu: SerieIdu[]
  seriesOdu: SerieOdu[]
}

interface Props {
  diagId: string
  relatorio: Relatorio
  equipamentoId: string
  equipamentoNome: string
  equipamentoMarca: string
  equipamentoModelo: string | null
  criadoEm: string
  dataInspecao: string | null
  arquivoIduNome: string | null
  arquivoOduNome: string | null
  config?: {
    nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
    corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
  } | null
}

const STATUS_CONFIG = {
  normal:  { label: 'Normal',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle,   color: '#059669' },
  atencao: { label: 'Atenção', cls: 'bg-yellow-100  text-yellow-700  border-yellow-200',  Icon: AlertTriangle, color: '#d97706' },
  critico: { label: 'Crítico', cls: 'bg-red-100     text-red-700     border-red-200',     Icon: XCircle,       color: '#dc2626' },
}
const NIVEL_ICON = {
  normal:  { Icon: CheckCircle,   cls: 'text-emerald-500' },
  atencao: { Icon: AlertTriangle, cls: 'text-yellow-500'  },
  critico: { Icon: XCircle,       cls: 'text-red-500'     },
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

function KpiPrintRow({ label, kpi, unit }: { label: string; kpi?: Kpi; unit: string }) {
  if (!kpi) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: '8.5pt', color: '#555' }}>{label}</span>
      <span style={{ fontSize: '8.5pt', fontWeight: 700 }}>
        {kpi.media} {unit}
        <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>({kpi.min}–{kpi.max})</span>
      </span>
    </div>
  )
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

/* Renderiza ResponsiveContainer na tela e LineChart com largura fixa na impressão */
function DualChart({ children, printChart }: {
  children: React.ReactNode
  printChart: React.ReactNode
}) {
  return (
    <>
      <div className="print:hidden">{children}</div>
      <div className="hidden print:block">{printChart}</div>
    </>
  )
}

const CHART_W = 660
const CHART_H_PRINT = 150

export function RelatorioView({
  diagId, relatorio: r, equipamentoId, equipamentoNome, equipamentoMarca, equipamentoModelo,
  criadoEm, dataInspecao: initialDate, arquivoIduNome, arquivoOduNome, config,
}: Props) {
  const statusCfg = STATUS_CONFIG[r.status]
  const StatusIcon = statusCfg.Icon
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'

  const [dataInspecao, setDataInspecao] = useState(initialDate ? initialDate.split('T')[0] : '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(dataInspecao)
  const [isPending, startTransition] = useTransition()

  function startEdit() { setDraft(dataInspecao); setEditing(true) }
  function cancelEdit() { setEditing(false) }
  function saveEdit() {
    startTransition(async () => {
      await atualizarDataInspecao(diagId, draft || null)
      setDataInspecao(draft)
      setEditing(false)
    })
  }

  const iduSamples = downsample(r.seriesIdu, 100)
  const oduSamples = downsample(r.seriesOdu, 100)
  const dataExibida = dataInspecao ? fmtDate(dataInspecao) : null

  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @page { size: A4; margin: 12mm 12mm 12mm 12mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Cabeçalho A4 — visível apenas na impressão ── */}
      <div className="hidden print:block mb-4 pb-3" style={{ borderBottom: '1.5px solid #111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Logo / Nome empresa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {config?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={nomeEmpresa} style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            ) : null}
            <div style={{ borderLeft: config?.logoUrl ? '1px solid #ccc' : undefined, paddingLeft: config?.logoUrl ? '10px' : 0 }}>
              <p style={{ fontWeight: 900, fontSize: '12pt', margin: 0 }}>{nomeEmpresa.toUpperCase()}</p>
              {config?.cnpj    && <p style={{ fontSize: '7.5pt', color: '#666', margin: 0 }}>CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p style={{ fontSize: '7.5pt', color: '#666', margin: 0 }}>{config.telefone}</p>}
              {config?.endereco && <p style={{ fontSize: '7.5pt', color: '#666', margin: 0 }}>{config.endereco}</p>}
            </div>
          </div>
          {/* Título e status */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', margin: '0 0 2px' }}>Diagnóstico LGMV</p>
            <p style={{ fontSize: '9pt', fontWeight: 700, margin: 0 }}>{equipamentoNome}</p>
            <p style={{ fontSize: '7.5pt', color: '#666', margin: '2px 0 4px' }}>
              {equipamentoMarca}{equipamentoModelo ? ` ${equipamentoModelo}` : ''}
            </p>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
              fontSize: '8.5pt', fontWeight: 700,
              backgroundColor: statusCfg.color + '22', color: statusCfg.color, border: `1px solid ${statusCfg.color}55`,
            }}>
              {statusCfg.label}
            </span>
            <p style={{ fontSize: '7.5pt', color: '#777', margin: '4px 0 0' }}>
              {dataExibida ? `Inspeção: ${dataExibida}` : `Gerado em: ${new Date(criadoEm).toLocaleDateString('pt-BR')}`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Header card — visível na tela */}
        <div className="bg-white rounded-2xl border border-border p-6 print:hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Activity size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">Diagnóstico LGMV</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                  <StatusIcon size={12} />{statusCfg.label}
                </span>
                <button
                  onClick={() => window.print()}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  <Printer size={13} /> Imprimir / PDF
                </button>
              </div>
              <p className="text-sm text-gray-500">{equipamentoNome}</p>

              {/* Data de inspeção editável */}
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar size={12} className="text-gray-400 shrink-0" />
                {editing ? (
                  <>
                    <input
                      type="date"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="border border-border rounded px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button onClick={saveEdit} disabled={isPending} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-600">
                      {dataExibida ?? <span className="text-gray-400">Data de inspeção não informada</span>}
                    </span>
                    <button onClick={startEdit} className="text-gray-300 hover:text-primary transition-colors" title="Editar data de inspeção">
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-0.5">
                Gerado em {new Date(criadoEm).toLocaleString('pt-BR')} · Modo: {r.modo} · Duração: {r.duracao} · {r.totalLeituras} leituras
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
        <div className={`rounded-2xl border p-5 print:rounded-none print:border-gray-200 ${statusCfg.cls}`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">Laudo Técnico</p>
          <p className="text-sm leading-relaxed">{r.laudo}</p>
        </div>

        {/* KPI Grid — tela */}
        <div className="print:hidden">
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

        {/* KPI print — 2 colunas */}
        <div className="hidden print:block" style={{ pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
            Parâmetros de Operação
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <KpiPrintRow label="Superaquecimento" kpi={r.kpis.superaquecimento} unit="°C" />
            <KpiPrintRow label="Pressão de Sucção" kpi={r.kpis.pressaoBaixa} unit="psi" />
            <KpiPrintRow label="Pressão de Descarga" kpi={r.kpis.pressaoAlta} unit="psi" />
            <KpiPrintRow label="Temp. Descarga" kpi={r.kpis.tempDescarga} unit="°C" />
            <KpiPrintRow label="Temp. Evaporação" kpi={r.kpis.tempEvaporacao} unit="°C" />
            <KpiPrintRow label="Temp. Condensação" kpi={r.kpis.tempCondensacao} unit="°C" />
            <KpiPrintRow label="Consumo Elétrico" kpi={r.kpis.consumo} unit="kW" />
            <KpiPrintRow label="Freq. Compressor" kpi={r.kpis.freqCompressor} unit="Hz" />
          </div>
        </div>

        {/* Anomalias */}
        {r.anomalias.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3 print:text-xs print:font-bold print:text-gray-600">Análise de Parâmetros</h2>
            <div className="space-y-2 print:space-y-1">
              {r.anomalias.map((a, i) => {
                const { Icon, cls } = NIVEL_ICON[a.nivel]
                return (
                  <div key={i} className="bg-white rounded-xl border border-border px-4 py-3 flex items-start gap-3 print:rounded-none print:border-b print:border-x-0 print:border-t-0 print:px-0 print:py-1.5">
                    <Icon size={16} className={`${cls} shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 print:text-xs">{a.parametro}</span>
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
          <div className="bg-white rounded-2xl border border-border p-5 print:rounded-none print:border-0 print:p-0">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 print:text-xs print:mb-2">
              <Gauge size={14} /> Pressões de Operação (psi)
            </h2>
            <DualChart
              printChart={
                <LineChart width={CHART_W} height={CHART_H_PRINT} data={oduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 7 }} width={30} />
                  <Tooltip formatter={(v) => `${v} psi`} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line type="monotone" dataKey="highPress" name="Alta"   stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="monotone" dataKey="lowPress"  name="Sucção" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={oduSamples}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v} psi`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="highPress" name="Alta"   stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="monotone" dataKey="lowPress"  name="Sucção" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </DualChart>
          </div>
        )}

        {/* Chart: SH/SC */}
        {iduSamples.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5 print:rounded-none print:border-0 print:p-0">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 print:text-xs print:mb-2">
              <Activity size={14} /> Superaquecimento / Sub-resfriamento (°C)
            </h2>
            <DualChart
              printChart={
                <LineChart width={CHART_W} height={CHART_H_PRINT} data={iduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 7 }} width={30} />
                  <Tooltip formatter={(v) => `${v}°C`} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line type="monotone" dataKey="scsh"    name="SH/SC"        stroke="#8b5cf6" strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="monotone" dataKey="pipeIn"  name="Tubo Entrada" stroke="#0ea5e9" strokeWidth={1}   dot={false} connectNulls />
                  <Line type="monotone" dataKey="pipeOut" name="Tubo Saída"   stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls />
                </LineChart>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={iduSamples}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}°C`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="scsh"    name="SH/SC"         stroke="#8b5cf6" strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="monotone" dataKey="pipeIn"  name="Tubo Entrada"  stroke="#0ea5e9" strokeWidth={1}   dot={false} connectNulls />
                  <Line type="monotone" dataKey="pipeOut" name="Tubo Saída"    stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </DualChart>
          </div>
        )}

        {/* Chart: Consumo + Frequência */}
        {oduSamples.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5 print:rounded-none print:border-0 print:p-0">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 print:text-xs print:mb-2">
              <Zap size={14} /> Consumo (kW) e Frequência do Compressor (Hz)
            </h2>
            <DualChart
              printChart={
                <LineChart width={CHART_W} height={CHART_H_PRINT} data={oduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left"  tick={{ fontSize: 7 }} width={30} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 7 }} width={30} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="power" name="Consumo (kW)" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="freq"  name="Freq. (Hz)"   stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={oduSamples}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="power" name="Consumo (kW)" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="freq"  name="Freq. (Hz)"   stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </DualChart>
          </div>
        )}

        {/* Erros */}
        {r.errosEncontrados.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 print:rounded-none">
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

        {/* Rodapé de impressão */}
        <div className="hidden print:flex justify-between pt-3 mt-4" style={{ borderTop: '1px solid #ddd' }}>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            Diagnóstico LGMV · {equipamentoNome} · {nomeEmpresa}
            {config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}
          </p>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            Gerado em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </>
  )
}
