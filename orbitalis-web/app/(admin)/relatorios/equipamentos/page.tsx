import { api } from '@/lib/api'
import { FiltroPeriodo } from '../filtro-periodo'
import { AcoesRelatorio } from '../exportar'
import { Cabecalho, Kpis, Cartao, Tabela, Th, Td, Barras, Selo, Erro, brl, pct } from '../ui'

type Linha = {
  equipamentoId: string; equipamento: string; marca: string | null; tipo: string; cliente: string; ambiente: string
  corretivas: number; preventivas: number; reincidente: boolean; mttrHoras: number | null; mtbfDias: number | null; custo: number
}
type Dados = {
  periodo: { de: string; ate: string }
  kpis: { equipamentosAtendidos: number; corretivas: number; preventivas: number; proporcaoPreventiva: number | null; reincidentes: number; semManutencao180d: number; custoCorretivas: number }
  linhas: Linha[]
  porTipo: { tipo: string; equipamentos: number; corretivas: number; preventivas: number }[]
  semManutencao: { equipamentoId: string; equipamento: string; cliente: string; ambiente: string }[]
}

export default async function RelEquipamentos({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const { de, ate } = await searchParams
  const q = new URLSearchParams(); if (de) q.set('de', de); if (ate) q.set('ate', ate)
  let d: Dados | null = null
  try { d = await api.get<Dados>(`/relatorios/equipamentos?${q}`) } catch { d = null }
  if (!d) return <div className="max-w-6xl"><Cabecalho titulo="Equipamentos e confiabilidade" sub="Quais equipamentos mais dão problema" /><Erro /></div>
  const k = d.kpis

  return (
    <div className="max-w-6xl">
      <Cabecalho titulo="Equipamentos e confiabilidade" sub="O.S. dos equipamentos dentro do período" periodo={d.periodo} />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <FiltroPeriodo de={d.periodo.de} ate={d.periodo.ate} />
        <AcoesRelatorio nome="equipamentos-confiabilidade" linhas={d.linhas as unknown as Record<string, unknown>[]} colunas={[
          { k: 'equipamento', t: 'Equipamento' }, { k: 'marca', t: 'Marca' }, { k: 'tipo', t: 'Tipo' }, { k: 'cliente', t: 'Cliente' }, { k: 'ambiente', t: 'Ambiente' },
          { k: 'corretivas', t: 'Corretivas' }, { k: 'preventivas', t: 'Preventivas concluídas' }, { k: 'mttrHoras', t: 'Tempo médio de reparo (h)' }, { k: 'mtbfDias', t: 'Dias entre falhas' }, { k: 'custo', t: 'Custo' },
        ]} />
      </div>

      <Kpis itens={[
        { rotulo: 'Equipamentos atendidos', valor: String(k.equipamentosAtendidos), nota: `${k.corretivas} corretivas · ${k.preventivas} preventivas` },
        { rotulo: 'Preventiva sobre o total', valor: pct(k.proporcaoPreventiva), nota: 'Quanto maior, menos quebra', tom: k.proporcaoPreventiva == null ? 'neutro' : k.proporcaoPreventiva >= 60 ? 'ok' : k.proporcaoPreventiva >= 30 ? 'alerta' : 'ruim' },
        { rotulo: 'Reincidentes', valor: String(k.reincidentes), nota: '3 ou mais corretivas no período', tom: k.reincidentes ? 'ruim' : 'ok' },
        { rotulo: 'Sem manutenção há 180 dias', valor: String(k.semManutencao180d), nota: 'Equipamentos ativos sem O.S. concluída', tom: k.semManutencao180d ? 'alerta' : 'ok' },
      ]} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Cartao titulo="Corretivas por tipo de equipamento">
          <Barras linhas={d.porTipo.map((t) => ({ rotulo: t.tipo, valor: t.corretivas, cor: '#c2410c' }))} />
        </Cartao>
        <Cartao titulo="Custo das O.S. por tipo" dica="Mão de obra + peças lançadas, dividido entre os equipamentos da O.S.">
          <p className="text-2xl font-semibold text-gray-900">{brl(k.custoCorretivas)}</p>
          <p className="text-xs text-gray-400 mt-1">no período, em todos os equipamentos atendidos</p>
        </Cartao>
      </div>

      <Cartao titulo="Equipamentos com mais corretivas" dica="Os 300 primeiros do período; a planilha leva todos os listados">
        {d.linhas.length === 0 ? <p className="text-sm text-gray-400">Nenhum equipamento atendido no período.</p> : (
          <Tabela>
            <thead><tr><Th>Equipamento</Th><Th>Cliente / ambiente</Th><Th dir>Corretivas</Th><Th dir>Preventivas</Th><Th dir>Reparo médio</Th><Th dir>Entre falhas</Th><Th dir>Custo</Th><Th>{' '}</Th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.linhas.slice(0, 40).map((l) => (
                <tr key={l.equipamentoId}>
                  <Td forte>{l.equipamento}<span className="block text-xs text-gray-400 font-normal">{[l.marca, l.tipo].filter(Boolean).join(' · ')}</span></Td>
                  <Td>{l.cliente}<span className="block text-xs text-gray-400">{l.ambiente}</span></Td>
                  <Td dir><span className={l.corretivas >= 3 ? 'text-red-600 font-medium' : ''}>{l.corretivas}</span></Td>
                  <Td dir>{l.preventivas}</Td>
                  <Td dir>{l.mttrHoras == null ? '—' : `${l.mttrHoras} h`}</Td>
                  <Td dir>{l.mtbfDias == null ? '—' : `${l.mtbfDias} d`}</Td>
                  <Td dir>{brl(l.custo)}</Td>
                  <Td>{l.reincidente && <Selo tom="ruim">Reincidente</Selo>}</Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {d.linhas.length > 40 && <p className="text-xs text-gray-400 mt-3">Mostrando 40 de {d.linhas.length}. A planilha traz a lista completa.</p>}
      </Cartao>

      <Cartao titulo="Sem manutenção há mais de 180 dias" dica="Equipamentos ativos sem nenhuma O.S. concluída no período (até 100 listados)">
        {d.semManutencao.length === 0 ? <p className="text-sm text-gray-400">Todos os equipamentos tiveram manutenção recente.</p> : (
          <Tabela>
            <thead><tr><Th>Equipamento</Th><Th>Cliente</Th><Th>Ambiente</Th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.semManutencao.map((e) => <tr key={e.equipamentoId}><Td forte>{e.equipamento}</Td><Td>{e.cliente}</Td><Td>{e.ambiente}</Td></tr>)}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </div>
  )
}
