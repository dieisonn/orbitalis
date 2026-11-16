import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const brl = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
export const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`)
export const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
export const mesBr = (m: string) => { const [a, mm] = m.split('-'); return `${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(mm) - 1]}/${a.slice(2)}` }

export function Cabecalho({ titulo, sub, periodo }: { titulo: string; sub: string; periodo?: { de: string; ate: string } }) {
  return (
    <div className="mb-5">
      <Link href="/relatorios" className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary mb-2 print:hidden"><ArrowLeft size={12} /> Relatórios</Link>
      <h1 className="text-xl font-semibold text-gray-900">{titulo}</h1>
      <p className="text-sm text-gray-500 mt-0.5">{sub}{periodo ? ` · ${dataBr(periodo.de)} a ${dataBr(periodo.ate)}` : ''}</p>
    </div>
  )
}

type Tom = 'ok' | 'alerta' | 'ruim' | 'neutro'
const TOM: Record<Tom, string> = { ok: 'text-green-700', alerta: 'text-amber-600', ruim: 'text-red-600', neutro: 'text-gray-900' }

export function Kpis({ itens }: { itens: { rotulo: string; valor: string; nota?: string; tom?: Tom }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {itens.map((k) => (
        <div key={k.rotulo} className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-gray-500">{k.rotulo}</p>
          <p className={`text-2xl font-semibold mt-1 ${TOM[k.tom ?? 'neutro']}`}>{k.valor}</p>
          {k.nota && <p className="text-xs text-gray-400 mt-1">{k.nota}</p>}
        </div>
      ))}
    </div>
  )
}

export function Cartao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-border p-5 mb-5 print:break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-800">{titulo}</h2>
      {dica && <p className="text-xs text-gray-400 mt-0.5">{dica}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Barras horizontais simples (sem biblioteca): cada linha com rótulo, barra proporcional e valor. */
export function Barras({ linhas, formato }: { linhas: { rotulo: string; valor: number; cor?: string }[]; formato?: (n: number) => string }) {
  const max = Math.max(1, ...linhas.map((l) => l.valor))
  if (!linhas.length) return <p className="text-sm text-gray-400">Sem dados no período.</p>
  return (
    <div className="space-y-2">
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-gray-700" title={l.rotulo}>{l.rotulo}</span>
          <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(l.valor / max) * 100}%`, background: l.cor ?? '#1a2268' }} />
          </div>
          <span className="w-24 text-right tabular-nums text-gray-800">{formato ? formato(l.valor) : l.valor}</span>
        </div>
      ))}
    </div>
  )
}

export function Selo({ children, tom }: { children: React.ReactNode; tom: Tom }) {
  const c = { ok: 'bg-green-50 text-green-700', alerta: 'bg-amber-50 text-amber-700', ruim: 'bg-red-50 text-red-700', neutro: 'bg-gray-100 text-gray-600' }[tom]
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{children}</span>
}

export const Th = ({ children, dir }: { children: React.ReactNode; dir?: boolean }) => (
  <th className={`py-2 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap ${dir ? 'text-right' : 'text-left'}`}>{children}</th>
)
export const Td = ({ children, dir, forte }: { children: React.ReactNode; dir?: boolean; forte?: boolean }) => (
  <td className={`py-2 px-3 text-sm ${dir ? 'text-right tabular-nums' : ''} ${forte ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{children}</td>
)
export const Tabela = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto"><table className="w-full">{children}</table></div>
)
export const Erro = () => <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">Não foi possível carregar este relatório agora. Tente novamente em instantes.</div>
