'use client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'

type Ponto = { mes: string; mttr: number }

type Props = {
  dados: Ponto[]
  limite: number
}

export function MttrTrendChart({ dados, limite }: Props) {
  if (dados.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm mb-6">
      <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Tendência de MTTR por mês (horas)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}h`}
            width={36}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v) => [`${v}h`, 'MTTR']}
          />
          <ReferenceLine
            y={limite}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: `Limite ${limite}h`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
          />
          <Line
            type="monotone"
            dataKey="mttr"
            stroke="#0505ad"
            strokeWidth={2}
            dot={{ r: 4, fill: '#0505ad', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
