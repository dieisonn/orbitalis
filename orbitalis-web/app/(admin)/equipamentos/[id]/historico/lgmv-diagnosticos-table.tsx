'use client'

import { useState, useMemo } from 'react'
import { Pencil, Check, X, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { atualizarDataInspecao } from '../diagnosticos/actions'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Kpi = { media: number; min: number; max: number }

export type DiagnosticoResumido = {
  id: string
  criadoEm: string
  dataInspecao: string | null
  arquivoIduNome: string | null
  arquivoOduNome: string | null
  relatorio: {
    status: 'normal' | 'atencao' | 'critico'
    modo: string
    duracao: string
    kpis: {
      superaquecimento?: Kpi
      pressaoBaixa?: Kpi
      pressaoAlta?: Kpi
      consumo?: Kpi
      freqCompressor?: Kpi
    }
  }
  os: { id: string; numero: number } | null
}

type Props = {
  equipamentoId: string
  diagnosticos: DiagnosticoResumido[]
}

const KPIS: { key: keyof DiagnosticoResumido['relatorio']['kpis']; label: string; unit: string; color: string }[] = [
  { key: 'superaquecimento', label: 'Superaquecimento',    unit: '°C',  color: '#f59e0b' },
  { key: 'pressaoBaixa',     label: 'Pressão de Sucção',   unit: 'psi', color: '#3b82f6' },
  { key: 'pressaoAlta',      label: 'Pressão de Descarga', unit: 'psi', color: '#8b5cf6' },
  { key: 'consumo',          label: 'Consumo Elétrico',    unit: 'kW',  color: '#10b981' },
  { key: 'freqCompressor',   label: 'Freq. Compressor',    unit: 'Hz',  color: '#ef4444' },
]

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function fmtDataExibida(d: DiagnosticoResumido): string {
  return d.dataInspecao
    ? new Date(d.dataInspecao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : new Date(d.criadoEm).toLocaleDateString('pt-BR')
}

export function LgmvDiagnosticosTable({ equipamentoId, diagnosticos: initial }: Props) {
  const [diags, setDiags] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const lineData = useMemo(() => {
    return [...diags]
      .sort((a, b) => {
        const da = new Date(a.dataInspecao ?? a.criadoEm).getTime()
        const db = new Date(b.dataInspecao ?? b.criadoEm).getTime()
        return da - db
      })
      .map((d) => {
        const point: Record<string, number | string | null> = { data: fmtDataExibida(d) }
        for (const kpi of KPIS) {
          point[kpi.key] = d.relatorio.kpis[kpi.key]?.media ?? null
        }
        return point
      })
  }, [diags])

  async function handleSave(id: string) {
    setSaving(true)
    const result = await atualizarDataInspecao(id, editValue || null)
    setSaving(false)
    if (result.ok) {
      setDiags(prev =>
        prev.map(d =>
          d.id === id
            ? { ...d, dataInspecao: editValue ? new Date(editValue).toISOString() : null }
            : d,
        ),
      )
      setEditingId(null)
    }
  }

  function handleEdit(d: DiagnosticoResumido) {
    setEditingId(d.id)
    setEditValue(d.dataInspecao ? toDateInput(d.dataInspecao) : toDateInput(d.criadoEm))
  }

  return (
    <>
      {/* Tabela de inspeções */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {['Inspeção', 'Status', 'Modo', 'Duração', 'O.S.', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {diags.map((d) => {
              const st = d.relatorio.status
              const StatusIcon = st === 'critico' ? XCircle : st === 'atencao' ? AlertTriangle : CheckCircle
              const stCls = st === 'critico' ? 'text-red-500' : st === 'atencao' ? 'text-yellow-500' : 'text-emerald-500'
              const stLabel = st === 'critico' ? 'Crítico' : st === 'atencao' ? 'Atenção' : 'Normal'
              const isEditing = editingId === d.id

              return (
                <tr key={d.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-xs border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          disabled={saving}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(d.id)}
                          disabled={saving}
                          className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="text-red-400 hover:text-red-500"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>{fmtDataExibida(d)}</span>
                        <button
                          onClick={() => handleEdit(d)}
                          className="text-gray-400 hover:text-primary transition-colors"
                          title="Editar data de inspeção"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-semibold ${stCls}`}>
                      <StatusIcon size={12} />{stLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{d.relatorio.modo}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{d.relatorio.duracao}</td>
                  <td className="px-4 py-3 text-xs">
                    {d.os ? (
                      <a href={`/ordens-servico/${d.os.id}`} className="text-primary hover:underline font-mono">
                        OS-{String(d.os.numero).padStart(4, '0')}
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <a
                      href={`/equipamentos/${equipamentoId}/diagnosticos/${d.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Relatório
                    </a>
                    <a
                      href={`/equipamentos/${equipamentoId}/diagnosticos/${d.id}/pdf`}
                      target="_blank"
                      className="text-xs text-gray-400 hover:text-primary hover:underline"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Gráficos de linha por KPI */}
      {diags.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-5">
          <p className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            Evolução dos parâmetros
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {KPIS.map(({ key, label, unit, color }) => {
              const hasData = lineData.some(p => p[key] !== null)
              return (
                <div key={key}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    {label}
                    <span className="font-normal text-gray-400 ml-1">({unit})</span>
                  </p>
                  {hasData ? (
                    <ResponsiveContainer width="100%" height={110}>
                      <LineChart data={lineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="data"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          allowDecimals
                          width={40}
                        />
                        <Tooltip
                          formatter={(v) => [`${v} ${unit}`, label]}
                          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
                        />
                        <Line
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[110px] flex items-center justify-center text-xs text-gray-300">
                      Sem dados
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comparativo de KPIs entre inspeções */}
      {diags.length > 1 && (
        <div className="bg-white rounded-2xl border border-border overflow-x-auto shadow-sm">
          <div className="px-5 py-3.5 border-b border-border bg-surface">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Comparativo entre inspeções
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Parâmetro</th>
                {[...diags].reverse().map((d) => {
                  const st = d.relatorio.status
                  const stCls = st === 'critico' ? 'text-red-500' : st === 'atencao' ? 'text-yellow-600' : 'text-emerald-600'
                  return (
                    <th key={d.id} className="text-center px-4 py-2.5 font-semibold text-gray-600">
                      <a href={`/equipamentos/${equipamentoId}/diagnosticos/${d.id}`} className="hover:underline">
                        {fmtDataExibida(d)}
                      </a>
                      <br />
                      <span className={`font-normal text-[10px] ${stCls}`}>
                        {st === 'critico' ? 'Crítico' : st === 'atencao' ? 'Atenção' : 'Normal'}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { label: 'Superaquecimento',    key: 'superaquecimento',  unit: '°C'  },
                { label: 'Pressão de Sucção',   key: 'pressaoBaixa',      unit: 'psi' },
                { label: 'Pressão de Descarga', key: 'pressaoAlta',       unit: 'psi' },
                { label: 'Consumo Elétrico',    key: 'consumo',           unit: 'kW'  },
                { label: 'Freq. Compressor',    key: 'freqCompressor',    unit: 'Hz'  },
              ].map(({ label, key, unit }) => (
                <tr key={key} className="hover:bg-surface">
                  <td className="px-4 py-2.5 font-semibold text-gray-600">{label}</td>
                  {[...diags].reverse().map((d) => {
                    const kpi = (d.relatorio.kpis as any)[key] as Kpi | undefined
                    return (
                      <td key={d.id} className="px-4 py-2.5 text-center text-gray-700">
                        {kpi ? (
                          <span>
                            <span className="font-bold">{kpi.media}</span>
                            <span className="text-gray-400 ml-0.5">{unit}</span>
                            <br />
                            <span className="text-[10px] text-gray-400">{kpi.min}–{kpi.max}</span>
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
