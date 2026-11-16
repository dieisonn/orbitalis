import { api } from '@/lib/api'
import { FiltroPeriodo } from '../filtro-periodo'
import { AcoesRelatorio } from '../exportar'
import { Cabecalho, Kpis, Cartao, Tabela, Th, Td, Barras, Erro, brl, mesBr } from '../ui'

type Dados = {
  periodo: { de: string; ate: string }
  kpis: { receitaOs: number; maoObra: number; pecas: number; ticketMedio: number | null; orcamentosAprovados: number; orcamentosQtd: number; receitaMensalContratos: number; osConcluidasSemValor: number; osConcluidas: number }
  porMes: { mes: string; maoObra: number; pecas: number; os: number }[]
  porCliente: { clienteId: string; cliente: string; os: number; maoObra: number; pecas: number; total: number }[]
  porTipo: { tipo: string; os: number; total: number }[]
}
const TIPO: Record<string, string> = { preventiva: 'Preventivas', corretiva: 'Corretivas', nao_se_aplica: 'Visitas e outros' }

export default async function RelFinanceiro({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const { de, ate } = await searchParams
  const q = new URLSearchParams(); if (de) q.set('de', de); if (ate) q.set('ate', ate)
  let d: Dados | null = null
  try { d = await api.get<Dados>(`/relatorios/financeiro?${q}`) } catch { d = null }
  if (!d) return <div className="max-w-6xl"><Cabecalho titulo="Financeiro" sub="Valores lançados nas O.S. concluídas" /><Erro /></div>
  const k = d.kpis

  return (
    <div className="max-w-6xl">
      <Cabecalho titulo="Financeiro" sub="O.S. concluídas dentro do período" periodo={d.periodo} />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <FiltroPeriodo de={d.periodo.de} ate={d.periodo.ate} />
        <AcoesRelatorio nome="financeiro-por-cliente" linhas={d.porCliente as unknown as Record<string, unknown>[]} colunas={[
          { k: 'cliente', t: 'Cliente' }, { k: 'os', t: 'O.S. concluídas' }, { k: 'maoObra', t: 'Mão de obra' }, { k: 'pecas', t: 'Peças' }, { k: 'total', t: 'Total' },
        ]} />
      </div>

      <Kpis itens={[
        { rotulo: 'Valor das O.S. concluídas', valor: brl(k.receitaOs), nota: `Mão de obra ${brl(k.maoObra)} · peças ${brl(k.pecas)}` },
        { rotulo: 'Ticket médio por O.S.', valor: brl(k.ticketMedio), nota: 'Só O.S. com valor lançado' },
        { rotulo: 'Orçamentos aprovados', valor: brl(k.orcamentosAprovados), nota: `${k.orcamentosQtd} no período` },
        { rotulo: 'Contratos (por mês)', valor: brl(k.receitaMensalContratos), nota: 'Valor mensal dos contratos vigentes' },
      ]} />

      {k.osConcluidasSemValor > 0 && (
        <div className="mb-5 rounded-xl bg-amber-50 text-amber-800 text-sm p-4">
          {k.osConcluidasSemValor} de {k.osConcluidas} O.S. concluídas estão sem valor lançado (mão de obra e peças). Os totais acima podem estar menores que o real.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Cartao titulo="Valor por mês" dica="Mão de obra + peças, por mês de conclusão">
          <Barras linhas={d.porMes.map((m) => ({ rotulo: mesBr(m.mes), valor: m.maoObra + m.pecas }))} formato={brl} />
        </Cartao>
        <Cartao titulo="Valor por tipo de O.S.">
          <Barras linhas={d.porTipo.map((t) => ({ rotulo: TIPO[t.tipo] ?? t.tipo, valor: t.total }))} formato={brl} />
        </Cartao>
      </div>

      <Cartao titulo="Valor por cliente" dica="Os 30 maiores do período">
        {d.porCliente.length === 0 ? <p className="text-sm text-gray-400">Nenhuma O.S. concluída no período.</p> : (
          <Tabela>
            <thead><tr><Th>Cliente</Th><Th dir>O.S.</Th><Th dir>Mão de obra</Th><Th dir>Peças</Th><Th dir>Total</Th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.porCliente.map((c) => <tr key={c.clienteId}><Td forte>{c.cliente}</Td><Td dir>{c.os}</Td><Td dir>{brl(c.maoObra)}</Td><Td dir>{brl(c.pecas)}</Td><Td dir forte>{brl(c.total)}</Td></tr>)}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </div>
  )
}
