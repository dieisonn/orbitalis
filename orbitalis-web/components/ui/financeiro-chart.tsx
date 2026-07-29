'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

type Ponto = { mes: string; valor: number }

function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMes(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${ano.slice(2)}`
}

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

function CustomTick({ x, y, payload, atualLabel }: {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  atualLabel: string
}) {
  if (!payload) return null
  const isAtual = payload.value === atualLabel
  return (
    <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
      <text
        x={0} y={0} dy={4}
        textAnchor="end"
        transform="rotate(-40)"
        fontSize={isAtual ? 11 : 10}
        fontWeight={isAtual ? 700 : 400}
        fill={isAtual ? '#0505ad' : '#6b7280'}
      >
        {payload.value}
      </text>
    </g>
  )
}

function TooltipBRL({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-primary font-bold">
        {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  )
}

export function FinanceiroChart({ data }: { data: Ponto[] }) {
  if (!data || data.every((d) => d.valor === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Nenhuma receita registrada ainda.
      </div>
    )
  }

  const atual = mesAtual()
  const atualLabel = formatMes(atual)
  const formatted = data.map((d) => ({ ...d, mes: formatMes(d.mes) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde3f5" />
        <XAxis
          dataKey="mes"
          tick={(props) => <CustomTick {...props} atualLabel={atualLabel} />}
          interval={0}
          height={48}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtBRL}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          width={52}
        />
        <Tooltip content={<TooltipBRL />} />
        <ReferenceLine x={atualLabel} stroke="#0505ad" strokeDasharray="4 2" strokeWidth={1.5} />
        <Bar dataKey="valor" fill="#0505ad" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
