import Link from 'next/link'
import { api } from '@/lib/api'
import { Filter } from 'lucide-react'

type Orc = {
  id: string; numero: number; status: string; titulo: string; valor: number
  ordemServico: { id: string; numero: number | null; sigla: string } | null
}
type Visita = {
  id: string; numero: number | null; sigla: string; dataConclusao: string | null
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  tecnico: string | null
  resultado: 'fechada' | 'em_aberto' | 'perdida' | 'sem_orcamento'
  valor: number
  orcamentos: Orc[]
}
type Funil = {
  periodo: { de: string; ate: string }
  totais: {
    visitas: number; comOrcamento: number; fechadas: number; emAberto: number
    perdidas: number; semOrcamento: number; taxaConversao: number | null
    valorFechado: number; valorEmAberto: number
  }
  visitas: Visita[]
}

const RES: Record<Visita['resultado'], { label: string; cls: string }> = {
  fechada: { label: 'Serviço fechado', cls: 'bg-green-50 text-green-700' },
  em_aberto: { label: 'Orçamento em aberto', cls: 'bg-blue-50 text-blue-700' },
  perdida: { label: 'Não fechou', cls: 'bg-red-50 text-red-600' },
  sem_orcamento: { label: 'Sem orçamento', cls: 'bg-gray-100 text-gray-600' },
}
const FILTROS = [
  ['', 'Todas'], ['fechada', 'Fechadas'], ['em_aberto', 'Em aberto'], ['perdida', 'Não fecharam'], ['sem_orcamento', 'Sem orçamento'],
] as const

const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (sigla: string, n: number | null) => `${sigla}-${String(n ?? 0).padStart(4, '0')}`
const iso = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10)

type Props = { searchParams: Promise<{ de?: string; ate?: string; r?: string }> }

export default async function FunilVisitasPage({ searchParams }: Props) {
  const { de: deP, ate: ateP, r } = await searchParams
  const hoje = new Date()
  const ate = ateP || iso(hoje)
  const de = deP || iso(new Date(hoje.getTime() - 90 * 86400_000))

  const f = await api.get<Funil>(`/orcamentos/funil?de=${de}&ate=${ate}`).catch(() => null)
  const lista = (f?.visitas ?? []).filter((v) => !r || v.resultado === r)
  const t = f?.totais
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ de, ate, ...extra })
    return `/funil-visitas?${p.toString()}`
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Funil de visitas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Das visitas concluídas, quantas viraram orçamento e serviço fechado.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2" action="/funil-visitas">
          <label className="text-xs text-gray-500">De
            <input type="date" name="de" defaultValue={de} className="block mt-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg" />
          </label>
          <label className="text-xs text-gray-500">Até
            <input type="date" name="ate" defaultValue={ate} className="block mt-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg" />
          </label>
          <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg">Filtrar</button>
        </form>
      </div>

      {!t ? (
        <div className="bg-white border border-border rounded-xl p-6 text-sm text-gray-500">Não foi possível carregar o funil agora.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Visitas concluídas', String(t.visitas), `${t.semOrcamento} sem orçamento`],
              ['Geraram orçamento', String(t.comOrcamento), `${t.emAberto} em aberto · ${t.perdidas} não fecharam`],
              ['Serviços fechados', String(t.fechadas), t.taxaConversao === null ? '—' : `${t.taxaConversao}% de conversão`],
              ['Valor fechado', brl(t.valorFechado), t.valorEmAberto > 0 ? `${brl(t.valorEmAberto)} em aberto` : 'nada em aberto'],
            ].map(([titulo, valor, sub]) => (
              <div key={titulo} className="bg-white border border-border rounded-xl p-4">
                <p className="text-xs text-gray-500">{titulo}</p>
                <p className="text-2xl font-bold tabular-nums text-gray-900 mt-2">{valor}</p>
                <p className="text-[11px] text-gray-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS.map(([k, label]) => (
              <Link
                key={k} href={qs(k ? { r: k } : {})}
                className={`px-3 py-1.5 text-xs rounded-full border ${(r ?? '') === k ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border'}`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="bg-white border border-border rounded-xl overflow-x-auto">
            {lista.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <Filter size={20} className="mx-auto mb-2 text-gray-400" />
                {t.visitas === 0
                  ? 'Nenhuma visita concluída no período. Marque o tipo de serviço de visita em "Tipos de serviço" e vincule a visita ao criar o orçamento.'
                  : 'Nenhuma visita neste filtro.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-border">
                    <th className="px-4 py-2.5 font-medium">Visita</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Técnico</th>
                    <th className="px-4 py-2.5 font-medium">Resultado</th>
                    <th className="px-4 py-2.5 font-medium">Orçamento / O.S.</th>
                    <th className="px-4 py-2.5 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 align-top">
                      <td className="px-4 py-3">
                        <Link href={`/ordens-servico/${v.id}`} className="font-medium text-primary hover:underline">{num(v.sigla, v.numero)}</Link>
                        <p className="text-[11px] text-gray-500">{v.dataConclusao ? new Date(v.dataConclusao).toLocaleDateString('pt-BR') : '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{v.cliente.nomeFantasia || v.cliente.razaoSocial}</td>
                      <td className="px-4 py-3 text-gray-600">{v.tecnico ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${RES[v.resultado].cls}`}>{RES[v.resultado].label}</span>
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        {v.orcamentos.length === 0 && <span className="text-gray-400">—</span>}
                        {v.orcamentos.map((o) => (
                          <div key={o.id} className="text-xs text-gray-600">
                            <Link href={`/orcamentos/${o.id}`} className="text-primary hover:underline">Orç. #{o.numero}</Link>
                            <span className="text-gray-400"> · {o.status}</span>
                            {o.ordemServico && (
                              <> · <Link href={`/ordens-servico/${o.ordemServico.id}`} className="text-primary hover:underline">{num(o.ordemServico.sigla, o.ordemServico.numero)}</Link></>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">{v.valor > 0 ? brl(v.valor) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
