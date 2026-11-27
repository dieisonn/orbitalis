import Link from 'next/link'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Landmark, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { brl, dataBr, PERIODOS_FLUXO, periodoFluxo, type Fluxo, type Resumo } from '@/lib/financeiro'
import { AFaturarPainel } from './a-faturar'
import { FluxoChart } from './fluxo-chart'

function Cartao({ icone: Icone, rotulo, valor, detalhe, tom = 'neutro', href }: { icone: typeof Wallet; rotulo: string; valor: string; detalhe?: string; tom?: 'neutro' | 'bom' | 'ruim'; href?: string }) {
  const cor = tom === 'ruim' ? 'text-red-700' : tom === 'bom' ? 'text-green-700' : 'text-gray-900'
  const corpo = (
    <div className="bg-white rounded-xl border border-border p-4 h-full hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Icone size={14} aria-hidden /> {rotulo}</div>
      <p className={`mt-2 text-2xl font-bold ${cor}`}>{valor}</p>
      {detalhe && <p className="text-xs text-gray-500 mt-0.5">{detalhe}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{corpo}</Link> : corpo
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo = '30' } = await searchParams
  const p = periodoFluxo(periodo)
  const [resumo, fluxo] = await Promise.all([
    api.get<Resumo>('/financeiro/resumo').catch(() => null),
    api.get<Fluxo>(`/financeiro/fluxo?de=${p.de}&ate=${p.ate}&agrupar=${p.agrupar}`).catch(() => null),
  ])
  if (!resumo) return <p className="text-sm text-gray-500">Não foi possível carregar o financeiro agora. Tente novamente em instantes.</p>
  const n = (s: { qtd: number }, um: string, varios: string) => `${s.qtd} ${s.qtd === 1 ? um : varios}`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao icone={Wallet} rotulo="Saldo nas contas" valor={brl(resumo.saldoContas)} detalhe={`${resumo.contas.filter((c) => c.ativa).length} conta(s)`} tom={resumo.saldoContas < 0 ? 'ruim' : 'neutro'} href="/financeiro/contas" />
        <Cartao icone={ArrowDownCircle} rotulo="A receber" valor={brl(resumo.receberAberto.total)} detalhe={`${n(resumo.receberAberto, 'conta', 'contas')} em aberto`} href="/financeiro/receber" />
        <Cartao icone={ArrowUpCircle} rotulo="A pagar" valor={brl(resumo.pagarAberto.total)} detalhe={`${n(resumo.pagarAberto, 'conta', 'contas')} em aberto`} href="/financeiro/pagar" />
        <Cartao icone={AlertTriangle} rotulo="Em atraso" valor={brl(resumo.receberAtrasado.total + resumo.pagarAtrasado.total)}
          detalhe={`receber ${brl(resumo.receberAtrasado.total)} · pagar ${brl(resumo.pagarAtrasado.total)}`} tom={resumo.receberAtrasado.qtd + resumo.pagarAtrasado.qtd > 0 ? 'ruim' : 'neutro'} href="/financeiro/receber?status=atrasado" />
      </div>

      <AFaturarPainel itens={resumo.aFaturar} />

      <section aria-labelledby="fluxo" className="bg-white rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 id="fluxo" className="text-sm font-semibold text-gray-900">Fluxo de caixa</h2>
            <p className="text-xs text-gray-500">{p.rotulo} · {dataBr(p.de)} a {dataBr(p.ate)} · realizado pela data do pagamento, previsto pelo vencimento</p>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
            {PERIODOS_FLUXO.map(([k, r]) => (
              <Link key={k} href={`/financeiro?periodo=${k}`} aria-current={periodo === k || (k === '30' && !PERIODOS_FLUXO.some(([x]) => x === periodo)) ? 'true' : undefined}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${periodo === k ? 'bg-primary text-white border-primary' : 'border-border text-gray-700 hover:bg-surface'}`}>{r}</Link>
            ))}
          </div>
        </div>
        {fluxo ? (
          <>
            <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
              {[
                ['Saldo no início', fluxo.saldoInicial, ''],
                ['Entradas', fluxo.totais.entradasRealizadas + fluxo.totais.entradasPrevistas, 'text-green-700'],
                ['Saídas', fluxo.totais.saidasRealizadas + fluxo.totais.saidasPrevistas, 'text-red-700'],
                ['Saldo projetado no fim', fluxo.totais.saldoFinal, fluxo.totais.saldoFinal < 0 ? 'text-red-700' : 'text-gray-900'],
                ['Já realizado', fluxo.totais.entradasRealizadas - fluxo.totais.saidasRealizadas, ''],
              ].map(([r, v, c]) => (
                <div key={String(r)}><dt className="text-xs text-gray-500">{r}</dt><dd className={`font-semibold ${c}`}>{brl(Number(v))}</dd></div>
              ))}
            </dl>
            {(fluxo.atrasadosEntradas > 0 || fluxo.atrasadosSaidas > 0) && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Há contas vencidas antes deste período ainda em aberto (receber {brl(fluxo.atrasadosEntradas)} · pagar {brl(fluxo.atrasadosSaidas)}). Elas entram no primeiro dia, pois ainda vão acontecer.
              </p>
            )}
            <FluxoChart periodos={fluxo.periodos} />
          </>
        ) : <p className="text-sm text-gray-500">Não foi possível calcular o fluxo.</p>}
      </section>

      <section aria-labelledby="contas" className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 id="contas" className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Landmark size={15} aria-hidden /> Contas</h2>
          <Link href="/financeiro/contas" className="text-xs font-medium text-primary hover:underline">Gerenciar</Link>
        </div>
        <ul className="divide-y divide-border">
          {resumo.contas.filter((c) => c.ativa).map((c) => (
            <li key={c.id} className="flex justify-between py-2 text-sm"><span className="text-gray-800">{c.nome}</span><span className={`font-semibold ${c.saldoAtual < 0 ? 'text-red-700' : 'text-gray-900'}`}>{brl(c.saldoAtual)}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
