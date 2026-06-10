'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

type Ponto = {
  mes: string
  aberta: number
  agendada: number
  em_andamento: number
  concluida: number
  cancelada: number
}

const LABEL: Record<string, string> = {
  aberta: 'Abertas',
  agendada: 'Agendadas',
  em_andamento: 'Em Andamento',
  concluida: 'Concluídas',
  cancelada: 'Canceladas',
}

const COR: Record<string, string> = {
  aberta: '#2563eb',
  agendada: '#FF997E',
  em_andamento: '#EDD82A',
  concluida: '#16a34a',
  cancelada: '#B71247',
}

function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMes(mes: string) {
  const [ano, m] = mes.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m, 10) - 1]}/${ano.slice(2)}`
}

function CustomTick({ x, y, payload, atualLabel }: {
  x?: number; y?: number; payload?: { value: string }; atualLabel: string
}) {
  if (!payload) return null
  const isAtual = payload.value === atualLabel
  return (
    <text
      x={x} y={(y ?? 0) + 12}
      textAnchor="middle"
      fontSize={isAtual ? 12 : 11}
      fontWeight={isAtual ? 700 : 400}
      fill={isAtual ? '#0505ad' : '#6b7280'}
    >
      {payload.value}
    </text>
  )
}

export function OsChart({ data }: { data: Ponto[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sem dados históricos ainda.
      </div>
    )
  }

  const atual = mesAtual()
  const atualLabel = formatMes(atual)
  const formatted = data.map((d) => ({ ...d, mes: formatMes(d.mes) }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde3f5" />
        <XAxis
          dataKey="mes"
          tick={(props) => <CustomTick {...props} atualLabel={atualLabel} />}
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [value, LABEL[String(name)] ?? String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dde3f5' }}
        />
        <Legend formatter={(name) => LABEL[name] ?? name} wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine x={atualLabel} stroke="#0505ad" strokeDasharray="4 2" strokeWidth={1.5} />
        {Object.keys(COR).map((key) => (
          <Bar key={key} dataKey={key} fill={COR[key]} stackId="a" radius={key === 'cancelada' ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
