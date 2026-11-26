'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type DiaCap = { data: string; capacidadeMin: number; programadoMin: number; realizadoMin: number; tecnicosEmCampo: number }

const ROTULO: Record<string, string> = { capacidade: 'Disponível', programado: 'Programado', realizado: 'Realizado' }
const COR: Record<string, string> = { capacidade: '#c4ccd6', programado: '#4f6fb5', realizado: '#3d9970' }
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export const fmtHoras = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function CapacidadeChart({ dias }: { dias: DiaCap[] }) {
  const dados = dias.map((d) => {
    const dt = new Date(`${d.data}T12:00:00-03:00`)
    return {
      rotulo: dias.length <= 7 ? `${DIAS[dt.getDay()]} ${d.data.slice(8)}` : d.data.slice(8),
      capacidade: +(d.capacidadeMin / 60).toFixed(2),
      programado: +(d.programadoMin / 60).toFixed(2),
      realizado: +(d.realizadoMin / 60).toFixed(2),
    }
  })
  return (
    <div role="img" aria-label="Gráfico de horas disponíveis, programadas e realizadas por dia">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dados} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid strokeDasharray="2 4" stroke="#d9ddd7" vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} interval={0} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="h" allowDecimals={false} />
          <Tooltip
            formatter={(v, n) => [fmtHoras(Number(v) * 60), ROTULO[String(n)] ?? String(n)]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9ddd7' }}
          />
          <Legend formatter={(n) => ROTULO[n] ?? n} wrapperStyle={{ fontSize: 12 }} />
          {Object.keys(COR).map((k) => <Bar key={k} dataKey={k} fill={COR[k]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
