'use client'

import { useState, useMemo } from 'react'
import { Pencil, Check, X, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { atualizarDataInspecao } from '../diagnosticos/actions'
import { LgmvMensalChart } from '@/components/ui/lgmv-mensal-chart'

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

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function fmtDataExibida(d: DiagnosticoResumido): string {
  return d.dataInspecao
    ? new Date(d.dataInspecao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : new Date(d.criadoEm).toLocaleDateString('pt-BR')
}

function buildChartData(diags: DiagnosticoResumido[], ano: number) {
  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1, normal: 0, atencao: 0, critico: 0,
  }))
  for (const d of diags) {
    const date = d.dataInspecao ? new Date(d.dataInspecao) : new Date(d.criadoEm)
    if (date.getUTCFullYear() === ano) {
      const month = date.getUTCMonth()
      meses[month][d.relatorio.status]++
    }
  }
  return meses
}

export function LgmvDiagnosticosTable({ equipamentoId, diagnosticos: initial }: Props) {
  const [diags, setDiags] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const anoGrafico = useMemo(() => {
    if (diags.length === 0) return new Date().getFullYear()
    const anos = diags.map(d => {
      const iso = d.dataInspecao ?? d.criadoEm
      return new Date(iso).getUTCFullYear()
    })
    return Math.max(...anos)
  }, [diags])

  const chartData = useMemo(() => buildChartData(diags, anoGrafico), [diags, anoGrafico])

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

      {/* Gráfico mês a mês */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-5">
        <p className="text-sm font-bold text-gray-800 mb-4">
          Inspeções mês a mês — {anoGrafico}
        </p>
        <LgmvMensalChart data={chartData} ano={anoGrafico} />
      </div>

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
