'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
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

function formatMes(mes: string) {
  const [ano, m] = mes.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m, 10) - 1]}/${ano.slice(2)}`
}

export function OsChart({ data }: { data: Ponto[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sem dados históricos ainda.
      </div>
    )
  }

  const formatted = data.map((d) => ({ ...d, mes: formatMes(d.mes) }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde3f5" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [value, LABEL[String(name)] ?? String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dde3f5' }}
        />
        <Legend formatter={(name) => LABEL[name] ?? name} wrapperStyle={{ fontSize: 12 }} />
        {Object.keys(COR).map((key) => (
          <Bar key={key} dataKey={key} fill={COR[key]} stackId="a" radius={key === 'cancelada' ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
