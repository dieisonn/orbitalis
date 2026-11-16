import { api } from '@/lib/api'
import { FiltroPeriodo } from '../filtro-periodo'
import { AcoesRelatorio } from '../exportar'
import { Cabecalho, Kpis, Cartao, Tabela, Th, Td, Selo, Erro, brl, pct, dataBr } from '../ui'

type Linha = {
  id: string; cliente: string; descricao: string; vigenciaInicio: string; vigenciaFim: string; diasParaFim: number
  situacao: 'vigente' | 'vence_em_breve' | 'vencido' | 'renovado'
  planosAtivos: number; osIncluidas: number | null; osTotal: number; concluidas: number; atrasadas: number; futuras: number
  cumprimento: number | null; progresso: number | null; valorMensal: number | null; valorTotal: number | null
}
type Dados = {
  periodo: { de: string; ate: string }
  kpis: { vigentes: number; venceEmBreve: number; vencidosSemRenovar: number; cumprimentoGeral: number | null; osAtrasadas: number; receitaMensalRecorrente: number }
  linhas: Linha[]
}

const SIT = { vigente: ['Vigente', 'ok'], vence_em_breve: ['Vence em breve', 'alerta'], vencido: ['Vencido', 'ruim'], renovado: ['Renovado', 'neutro'] } as const

export default async function RelContratos({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const { de, ate } = await searchParams
  const q = new URLSearchParams(); if (de) q.set('de', de); if (ate) q.set('ate', ate)
  let d: Dados | null = null
  try { d = await api.get<Dados>(`/relatorios/contratos?${q}`) } catch { d = null }
  if (!d) return <div className="max-w-6xl"><Cabecalho titulo="Contratos e planos PMOC" sub="Cumprimento das visitas por contrato" /><Erro /></div>

  const k = d.kpis
  const exportLinhas = d.linhas.map((l) => ({
    cliente: l.cliente, contrato: l.descricao, inicio: dataBr(l.vigenciaInicio), fim: dataBr(l.vigenciaFim), situacao: SIT[l.situacao][0],
    osTotal: l.osTotal, concluidas: l.concluidas, atrasadas: l.atrasadas, futuras: l.futuras, cumprimento: l.cumprimento ?? '', valorMensal: l.valorMensal ?? '',
  }))

  return (
    <div className="max-w-6xl">
      <Cabecalho titulo="Contratos e planos PMOC" sub="Cumprimento das visitas por contrato" periodo={d.periodo} />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <FiltroPeriodo de={d.periodo.de} ate={d.periodo.ate} />
        <AcoesRelatorio nome="contratos-pmoc" linhas={exportLinhas} colunas={[
          { k: 'cliente', t: 'Cliente' }, { k: 'contrato', t: 'Contrato' }, { k: 'inicio', t: 'Início' }, { k: 'fim', t: 'Fim' }, { k: 'situacao', t: 'Situação' },
          { k: 'osTotal', t: 'O.S. no contrato' }, { k: 'concluidas', t: 'Concluídas' }, { k: 'atrasadas', t: 'Atrasadas' }, { k: 'futuras', t: 'A realizar' },
          { k: 'cumprimento', t: 'Cumprimento (%)' }, { k: 'valorMensal', t: 'Valor mensal' },
        ]} />
      </div>
      <p className="text-xs text-gray-400 -mt-2 mb-4">Mostra os contratos com vigência dentro do período.</p>

      <Kpis itens={[
        { rotulo: 'Contratos vigentes', valor: String(k.vigentes), nota: `${k.venceEmBreve} vencem em até 60 dias` },
        { rotulo: 'Cumprimento das visitas', valor: pct(k.cumprimentoGeral), nota: 'Das visitas já devidas, as feitas', tom: k.cumprimentoGeral == null ? 'neutro' : k.cumprimentoGeral >= 90 ? 'ok' : k.cumprimentoGeral >= 70 ? 'alerta' : 'ruim' },
        { rotulo: 'O.S. atrasadas', valor: String(k.osAtrasadas), nota: 'De contratos, ainda não feitas', tom: k.osAtrasadas ? 'ruim' : 'ok' },
        { rotulo: 'Receita mensal dos contratos', valor: brl(k.receitaMensalRecorrente), nota: 'Soma dos contratos vigentes' },
      ]} />

      <Cartao titulo="Contratos" dica="Ordenados por mais O.S. atrasadas e, depois, por vencimento mais próximo">
        {d.linhas.length === 0 ? <p className="text-sm text-gray-400">Nenhum contrato no período.</p> : (
          <Tabela>
            <thead><tr><Th>Cliente</Th><Th>Contrato</Th><Th>Vigência</Th><Th>Situação</Th><Th dir>Feitas</Th><Th dir>Atrasadas</Th><Th dir>A realizar</Th><Th dir>Cumprimento</Th><Th dir>Valor mensal</Th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.linhas.map((l) => {
                const [rot, tom] = SIT[l.situacao]
                return (
                  <tr key={l.id}>
                    <Td forte>{l.cliente}</Td>
                    <Td>{l.descricao}{l.osIncluidas ? <span className="block text-xs text-gray-400">{l.osTotal} de {l.osIncluidas} O.S. incluídas</span> : null}</Td>
                    <Td>{dataBr(l.vigenciaInicio)} → {dataBr(l.vigenciaFim)}</Td>
                    <Td><Selo tom={tom}>{rot}</Selo></Td>
                    <Td dir>{l.concluidas}</Td>
                    <Td dir><span className={l.atrasadas ? 'text-red-600 font-medium' : ''}>{l.atrasadas}</span></Td>
                    <Td dir>{l.futuras}</Td>
                    <Td dir>{pct(l.cumprimento)}</Td>
                    <Td dir>{brl(l.valorMensal)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </div>
  )
}
