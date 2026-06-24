'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

type Ponto = { mes: number; normal: number; atencao: number; critico: number }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const LABEL: Record<string, string> = {
  normal:  'Normal',
  atencao: 'Atenção',
  critico: 'Crítico',
}

const COR: Record<string, string> = {
  normal:  '#16a34a',
  atencao: '#f59e0b',
  critico: '#dc2626',
}

export function LgmvMensalChart({ data, ano }: { data: Ponto[]; ano: number }) {
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const formatted = data.map((d) => ({
    ...d,
    label: MESES[d.mes - 1],
    isAtual: ano === anoAtual && d.mes === mesAtual,
  }))

  const total = data.reduce((s, d) => s + d.normal + d.atencao + d.critico, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Nenhuma inspeção LGMV registrada em {ano}.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde3f5" />
        <XAxis
          dataKey="label"
          tick={({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value: string } }) => {
            const isAtual = !!payload?.value && !!formatted.find(d => d.label === payload!.value)?.isAtual
            return (
              <text
                x={Number(x ?? 0)} y={Number(y ?? 0) + 12}
                textAnchor="middle"
                fontSize={isAtual ? 12 : 11}
                fontWeight={isAtual ? 700 : 400}
                fill={isAtual ? '#0505ad' : '#6b7280'}
              >
                {payload?.value}
              </text>
            )
          }}
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [value, LABEL[String(name)] ?? String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dde3f5' }}
        />
        <Legend formatter={(name) => LABEL[name] ?? name} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="normal"  fill={COR.normal}  stackId="a" />
        <Bar dataKey="atencao" fill={COR.atencao} stackId="a" />
        <Bar dataKey="critico" fill={COR.critico} stackId="a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
