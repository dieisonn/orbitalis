'use client'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PeriodoFluxo } from '@/lib/financeiro'
import { brl } from '@/lib/financeiro'

const ROTULO: Record<string, string> = {
  entradas: 'Entradas (realizadas + previstas)', saidas: 'Saídas (realizadas + previstas)', saldoProjetado: 'Saldo projetado',
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloPeriodo(p: string) {
  if (p.length === 7) return `${MESES[Number(p.slice(5)) - 1]}/${p.slice(2, 4)}`
  return `${p.slice(8)}/${p.slice(5, 7)}`
}
const curto = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : String(Math.round(v)))

export function FluxoChart({ periodos }: { periodos: PeriodoFluxo[] }) {
  const dados = periodos.map((p) => ({
    rotulo: rotuloPeriodo(p.periodo),
    entradas: p.entradasRealizadas + p.entradasPrevistas,
    saidas: -(p.saidasRealizadas + p.saidasPrevistas),
    saldoProjetado: p.saldoProjetado,
  }))
  return (
    <div role="img" aria-label="Gráfico do fluxo de caixa: entradas, saídas e saldo projetado por período">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} stackOffset="sign">
          <CartesianGrid strokeDasharray="2 4" stroke="#d9ddd7" vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={curto} width={44} />
          <Tooltip formatter={(v, n) => [brl(Math.abs(Number(v))), ROTULO[String(n)] ?? String(n)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9ddd7' }} />
          <Legend formatter={(n) => ROTULO[n] ?? n} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="entradas" stackId="f" fill="#3d9970" radius={[3, 3, 0, 0]} />
          <Bar dataKey="saidas" stackId="f" fill="#c0504d" radius={[0, 0, 3, 3]} />
          <Line type="monotone" dataKey="saldoProjetado" stroke="#4f6fb5" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
