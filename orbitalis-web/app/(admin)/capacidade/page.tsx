import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { CapacidadeChart, fmtHoras, type DiaCap } from '@/components/ui/capacidade-chart'
import { JornadaConfig, type Jornada } from './jornada-config'

type Cap = {
  periodo: { de: string; ate: string }
  totais: {
    capacidadeMin: number; programadoMin: number; realizadoMin: number; capacidadeEmCampoMin: number
    ocupacao: number | null; aproveitamento: number | null; aderencia: number | null; programadoSemTecnicoMin: number
  }
  dias: (DiaCap & { capacidadeEmCampoMin: number })[]
  tecnicos: { id: string; nome: string; capacidadeMin: number; programadoMin: number; realizadoMin: number; diasEmCampo: number; ocupacao: number | null; aproveitamento: number | null }[]
}

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const mais = (s: string, n: number) => { const d = utc(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const hojeBR = () => iso(new Date(Date.now() - 3 * 3600_000))
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const br = (s: string) => s.split('-').reverse().slice(0, 2).join('/')

type Props = { searchParams: Promise<{ p?: string; d?: string }> }

export default async function CapacidadePage({ searchParams }: Props) {
  const { p, d } = await searchParams
  const modo = p === 'semana' ? 'semana' : 'mes'
  const ref = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hojeBR()

  let de: string, ate: string, ant: string, prox: string, titulo: string
  if (modo === 'semana') {
    const dt = utc(ref); const dow = (dt.getUTCDay() + 6) % 7 // segunda = 0
    de = mais(ref, -dow); ate = mais(de, 6); ant = mais(de, -7); prox = mais(de, 7)
    titulo = `Semana de ${br(de)} a ${br(ate)}`
  } else {
    const [y, m] = ref.split('-').map(Number)
    de = `${y}-${String(m).padStart(2, '0')}-01`
    ate = iso(new Date(Date.UTC(y, m, 0, 12)))
    ant = iso(new Date(Date.UTC(y, m - 2, 1, 12))); prox = iso(new Date(Date.UTC(y, m, 1, 12)))
    titulo = `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${y}`
  }
  const href = (pp: string, dd: string) => `/capacidade?p=${pp}&d=${dd}`

  const [cap, jornada] = await Promise.all([
    api.get<Cap>(`/capacidade?de=${de}&ate=${ate}`).catch(() => null),
    api.get<Jornada>('/capacidade/jornada').catch(() => null),
  ])
  const t = cap?.totais

  const cartoes = t ? [
    { titulo: 'Horas disponíveis', valor: fmtHoras(t.capacidadeMin), sub: `Jornada de todos os técnicos no período`, cor: 'bg-slate-400' },
    { titulo: 'Horas programadas', valor: fmtHoras(t.programadoMin), sub: t.ocupacao === null ? '—' : `${t.ocupacao}% do disponível`, cor: 'bg-[#4f6fb5]' },
    { titulo: 'Horas realizadas', valor: fmtHoras(t.realizadoMin), sub: t.aproveitamento === null ? '—' : `${t.aproveitamento}% do disponível`, cor: 'bg-[#3d9970]' },
    { titulo: 'Realizado ÷ programado', valor: t.aderencia === null ? '—' : `${t.aderencia}%`, sub: 'Quanto do programado foi executado', cor: 'bg-amber-500' },
  ] : []

  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Capacidade de horas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quanto da equipe está disponível, quanto foi programado em O.S. e quanto foi realmente executado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
            {(['semana', 'mes'] as const).map((m) => (
              <Link key={m} href={href(m, ref)} className={`px-3 py-2 ${modo === m ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-surface'}`}>{m === 'semana' ? 'Semana' : 'Mês'}</Link>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <Link href={href(modo, ant)} aria-label="Período anterior" className="p-2 border border-border rounded-lg hover:bg-surface text-gray-600"><ChevronLeft size={16} /></Link>
            <span className="px-2 text-sm font-medium text-gray-800 min-w-44 text-center">{titulo}</span>
            <Link href={href(modo, prox)} aria-label="Próximo período" className="p-2 border border-border rounded-lg hover:bg-surface text-gray-600"><ChevronRight size={16} /></Link>
          </div>
        </div>
      </div>

      {!cap || !t ? (
        <div className="bg-white border border-border rounded-xl p-6 text-sm text-gray-500">Não foi possível carregar os dados agora.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cartoes.map((c) => (
              <div key={c.titulo} className="bg-white border border-border rounded-xl p-4">
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${c.cor}`} />{c.titulo}</p>
                <p className="text-2xl font-bold tabular-nums text-gray-900 mt-2">{c.valor}</p>
                <p className="text-[11px] text-gray-500 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-border rounded-xl p-4">
            <h2 className="font-semibold text-gray-900 mb-1">Dia a dia</h2>
            <p className="text-xs text-gray-500 mb-3">
              Com dois ou mais técnicos em O.S. diferentes no mesmo dia, as horas se somam: 2 técnicos × 9 h = 18 h disponíveis.
            </p>
            <CapacidadeChart dias={cap.dias} />
            {t.programadoSemTecnicoMin > 0 && (
              <p className="text-xs text-amber-700 mt-2">{fmtHoras(t.programadoSemTecnicoMin)} programadas em O.S. ainda sem técnico (entram no programado, mas não em nenhum técnico).</p>
            )}
          </div>

          <div className="bg-white border border-border rounded-xl overflow-x-auto">
            <div className="px-4 pt-4"><h2 className="font-semibold text-gray-900">Por técnico</h2></div>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Técnico</th>
                  <th className="px-4 py-2.5 font-medium text-right">Disponível</th>
                  <th className="px-4 py-2.5 font-medium text-right">Programado</th>
                  <th className="px-4 py-2.5 font-medium text-right">Realizado</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ocupação</th>
                  <th className="px-4 py-2.5 font-medium text-right">Aproveitamento</th>
                </tr>
              </thead>
              <tbody>
                {cap.tecnicos.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sem técnicos com jornada no período.</td></tr>}
                {cap.tecnicos.map((x) => (
                  <tr key={x.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-gray-800">{x.nome}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtHoras(x.capacidadeMin)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtHoras(x.programadoMin)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtHoras(x.realizadoMin)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{x.ocupacao === null ? '—' : `${x.ocupacao}%`}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{x.aproveitamento === null ? '—' : `${x.aproveitamento}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-[11px] text-gray-500 border-t border-border">
              Conta só O.S. (eventos sem O.S. não entram). Programado = duração dos eventos da O.S. × pessoas (técnico + auxiliares). Realizado = entrada e saída registradas no fechamento, só O.S. concluídas.
            </p>
          </div>
        </>
      )}

      {jornada && (
        <details className="bg-white border border-border rounded-xl p-4">
          <summary className="font-semibold text-gray-900 cursor-pointer">Configurar jornada, folgas e ajustes</summary>
          <div className="mt-4"><JornadaConfig jornada={jornada} /></div>
        </details>
      )}
    </div>
  )
}
