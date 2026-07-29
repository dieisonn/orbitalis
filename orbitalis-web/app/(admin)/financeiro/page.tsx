import { api } from '@/lib/api'
import { FinanceiroChart } from '@/components/ui/financeiro-chart'
import {
  TrendingUp,
  Receipt,
  Wrench,
  BarChart2,
  ArrowUpRight,
  AlertTriangle,
  Clock,
} from 'lucide-react'

type UltimoAprovado = {
  id: string
  numero: number
  titulo: string
  cliente: string
  total: number
  aprovadoEm: string | null
}

type ContratoVencendo = {
  id: string
  descricao: string
  cliente: string
  valorMensal: number | null
  vigenciaFim: string
}

type Resumo = {
  receitaMes: number
  receitaTotal: number
  receitaPendente: number
  ticketMedio: number
  mrrContratos: number
  contratosAtivos: number
  contratosVencendo: ContratoVencendo[]
  custoMes: number
  custoMaoObra: number
  custoPecas: number
  margemMes: number
  evolucaoMensal: { mes: string; valor: number }[]
  ultimosAprovados: UltimoAprovado[]
}

const VAZIO: Resumo = {
  receitaMes: 0, receitaTotal: 0, receitaPendente: 0, ticketMedio: 0,
  mrrContratos: 0, contratosAtivos: 0, contratosVencendo: [],
  custoMes: 0, custoMaoObra: 0, custoPecas: 0, margemMes: 0,
  evolucaoMensal: [], ultimosAprovados: [],
}

function brl(v: number, opts?: { decimais?: boolean }) {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: opts?.decimais ? 2 : 0,
  })
}

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function diasAte(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default async function FinanceiroPage() {
  const r = await api.get<Resumo>('/financeiro/resumo').catch(() => VAZIO)

  const margemPct =
    r.receitaMes > 0 ? Math.round((r.margemMes / r.receitaMes) * 100) : null

  return (
    <div className="max-w-[1200px] space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Receita de orçamentos, contratos e custos operacionais
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-primary" />
            </div>
            <p className="text-xs text-gray-400">Receita do mês</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{brl(r.receitaMes)}</p>
          {r.receitaPendente > 0 && (
            <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
              <Clock size={10} />
              {brl(r.receitaPendente)} em análise
            </p>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <Receipt size={14} className="text-green-600" />
            </div>
            <p className="text-xs text-gray-400">MRR — Contratos</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{brl(r.mrrContratos)}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">{r.contratosAtivos} contrato(s) ativo(s)</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Wrench size={14} className="text-red-500" />
            </div>
            <p className="text-xs text-gray-400">Custo do mês</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{r.custoMes > 0 ? brl(r.custoMes) : '—'}</p>
          {r.custoMes > 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              MO {brl(r.custoMaoObra)} · Peças {brl(r.custoPecas)}
            </p>
          )}
        </div>

        <div className={[
          'border rounded-xl p-4',
          r.margemMes > 0 ? 'bg-emerald-50 border-emerald-200' :
          r.margemMes < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-border',
        ].join(' ')}>
          <div className="flex items-center gap-2 mb-3">
            <div className={[
              'w-7 h-7 rounded-lg flex items-center justify-center',
              r.margemMes > 0 ? 'bg-emerald-100' : r.margemMes < 0 ? 'bg-red-100' : 'bg-gray-100',
            ].join(' ')}>
              <BarChart2 size={14} className={r.margemMes > 0 ? 'text-emerald-600' : r.margemMes < 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
            <p className="text-xs text-gray-400">Margem estimada</p>
          </div>
          <p className={[
            'text-2xl font-bold tabular-nums',
            r.margemMes > 0 ? 'text-emerald-700' : r.margemMes < 0 ? 'text-red-600' : 'text-gray-300',
          ].join(' ')}>
            {r.custoMes === 0 && r.receitaMes === 0 ? '—' : brl(r.margemMes)}
          </p>
          {margemPct !== null && (
            <p className={[
              'text-[11px] mt-1.5',
              margemPct >= 0 ? 'text-emerald-600' : 'text-red-500',
            ].join(' ')}>
              {margemPct >= 0 ? '+' : ''}{margemPct}% sobre receita
            </p>
          )}
        </div>
      </div>

      {/* Gráfico + métricas secundárias */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="xl:col-span-2 bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Receita mensal — orçamentos aprovados (12 meses)
          </h2>
          <FinanceiroChart data={r.evolucaoMensal} />
        </div>

        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Resumo geral</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Receita total (aprovada)</p>
              <p className="text-sm font-bold tabular-nums text-gray-800">{brl(r.receitaTotal)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Ticket médio</p>
              <p className="text-sm font-bold tabular-nums text-gray-800">
                {r.ticketMedio > 0 ? brl(r.ticketMedio, { decimais: true }) : '—'}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Em análise (enviados)</p>
              <p className="text-sm font-bold tabular-nums text-amber-600">
                {r.receitaPendente > 0 ? brl(r.receitaPendente) : '—'}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">MRR contratos</p>
              <p className="text-sm font-bold tabular-nums text-green-700">
                {r.mrrContratos > 0 ? brl(r.mrrContratos) : '—'}
              </p>
            </div>
          </div>

          {r.contratosVencendo.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 flex items-center gap-1.5 mb-2">
                <AlertTriangle size={11} />
                Contratos vencendo em 30 dias ({r.contratosVencendo.length})
              </p>
              <div className="space-y-2">
                {r.contratosVencendo.map((c) => (
                  <a
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate group-hover:text-primary transition-colors">
                        {c.cliente}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Vence em {diasAte(c.vigenciaFim)} dias · {fmtData(c.vigenciaFim)}
                      </p>
                    </div>
                    {c.valorMensal !== null && (
                      <p className="text-xs font-semibold text-gray-700 shrink-0 tabular-nums">
                        {brl(c.valorMensal)}/mês
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Últimos orçamentos aprovados */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Orçamentos aprovados recentes</h2>
          <a
            href="/orcamentos"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            Ver todos <ArrowUpRight size={12} />
          </a>
        </div>

        {r.ultimosAprovados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Nenhum orçamento aprovado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                    Nº
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                    Título
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                    Cliente
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                    Aprovado em
                  </th>
                  <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {r.ultimosAprovados.map((orc) => (
                  <tr key={orc.id} className="hover:bg-surface transition-colors">
                    <td className="py-2.5 pr-4">
                      <a
                        href={`/orcamentos/${orc.id}`}
                        className="font-mono text-xs text-gray-500 hover:text-primary transition-colors"
                      >
                        #{String(orc.numero).padStart(4, '0')}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4">
                      <a
                        href={`/orcamentos/${orc.id}`}
                        className="text-gray-700 hover:text-primary transition-colors font-medium truncate max-w-[180px] block"
                      >
                        {orc.titulo}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs truncate max-w-[140px]">
                      {orc.cliente}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400 tabular-nums">
                      {fmtData(orc.aprovadoEm)}
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-gray-800">
                      {brl(orc.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
