import { api } from '@/lib/api'
import { FiltroPeriodo } from '../filtro-periodo'
import { AcoesRelatorio } from '../exportar'
import { Cabecalho, Kpis, Cartao, Tabela, Th, Td, Barras, Erro, pct, mesBr } from '../ui'

type Linha = {
  tecnicoId: string; tecnico: string; total: number; concluidas: number; emAberto: number; atrasadas: number; canceladas: number
  preventivas: number; corretivas: number; taxaConclusao: number | null; noPrazo: number | null; tempoMedioDias: number
  execucaoMediaHoras: number | null; equipamentosAtendidos: number; diasTrabalhados: number; osPorDia: number | null
}
type Dados = {
  periodo: { de: string; ate: string }
  kpis: { tecnicosAtivos: number; concluidas: number; taxaConclusao: number | null; atrasadas: number; semTecnico: number }
  linhas: Linha[]; porMes: { mes: string; total: number; concluidas: number }[]
}

export default async function RelProdutividade({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const { de, ate } = await searchParams
  const q = new URLSearchParams(); if (de) q.set('de', de); if (ate) q.set('ate', ate)
  let d: Dados | null = null
  try { d = await api.get<Dados>(`/relatorios/produtividade?${q}`) } catch { d = null }
  if (!d) return <div className="max-w-6xl"><Cabecalho titulo="Produtividade por técnico" sub="O que cada técnico fez" /><Erro /></div>
  const k = d.kpis

  return (
    <div className="max-w-6xl">
      <Cabecalho titulo="Produtividade por técnico" sub="O.S. agendadas dentro do período" periodo={d.periodo} />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <FiltroPeriodo de={d.periodo.de} ate={d.periodo.ate} />
        <AcoesRelatorio nome="produtividade-tecnicos" linhas={d.linhas as unknown as Record<string, unknown>[]} colunas={[
          { k: 'tecnico', t: 'Técnico' }, { k: 'total', t: 'O.S. no período' }, { k: 'concluidas', t: 'Concluídas' }, { k: 'emAberto', t: 'Em aberto' },
          { k: 'atrasadas', t: 'Atrasadas' }, { k: 'canceladas', t: 'Canceladas' }, { k: 'preventivas', t: 'Preventivas concluídas' }, { k: 'corretivas', t: 'Corretivas concluídas' },
          { k: 'taxaConclusao', t: 'Taxa de conclusão (%)' }, { k: 'noPrazo', t: 'Concluídas no dia (%)' }, { k: 'tempoMedioDias', t: 'Tempo médio até concluir (dias)' },
          { k: 'execucaoMediaHoras', t: 'Execução média (h)' }, { k: 'equipamentosAtendidos', t: 'Equipamentos atendidos' }, { k: 'diasTrabalhados', t: 'Dias com O.S. concluída' }, { k: 'osPorDia', t: 'O.S. por dia' },
        ]} />
      </div>

      <Kpis itens={[
        { rotulo: 'O.S. concluídas', valor: String(k.concluidas), nota: `${k.tecnicosAtivos} técnico(s) com O.S.` },
        { rotulo: 'Taxa de conclusão', valor: pct(k.taxaConclusao), nota: 'Concluídas / agendadas', tom: k.taxaConclusao == null ? 'neutro' : k.taxaConclusao >= 85 ? 'ok' : k.taxaConclusao >= 60 ? 'alerta' : 'ruim' },
        { rotulo: 'Atrasadas', valor: String(k.atrasadas), nota: 'Passaram da data e não foram concluídas', tom: k.atrasadas ? 'ruim' : 'ok' },
        { rotulo: 'Em aberto sem técnico', valor: String(k.semTecnico), nota: 'Aguardando triagem', tom: k.semTecnico ? 'alerta' : 'ok' },
      ]} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Cartao titulo="O.S. concluídas por técnico">
          <Barras linhas={d.linhas.map((l) => ({ rotulo: l.tecnico, valor: l.concluidas }))} />
        </Cartao>
        <Cartao titulo="Evolução por mês" dica="Concluídas / total agendado no mês">
          <Barras linhas={d.porMes.map((m) => ({ rotulo: mesBr(m.mes), valor: m.concluidas }))} formato={(n) => `${n}`} />
          <p className="text-xs text-gray-400 mt-2">{d.porMes.map((m) => `${mesBr(m.mes)}: ${m.concluidas}/${m.total}`).join(' · ')}</p>
        </Cartao>
      </div>

      <Cartao titulo="Detalhe por técnico">
        {d.linhas.length === 0 ? <p className="text-sm text-gray-400">Nenhuma O.S. com técnico no período.</p> : (
          <Tabela>
            <thead><tr><Th>Técnico</Th><Th dir>Total</Th><Th dir>Concluídas</Th><Th dir>Em aberto</Th><Th dir>Atrasadas</Th><Th dir>Taxa</Th><Th dir>No dia</Th><Th dir>Tempo médio</Th><Th dir>Equip.</Th><Th dir>O.S./dia</Th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.linhas.map((l) => (
                <tr key={l.tecnicoId}>
                  <Td forte>{l.tecnico}<span className="block text-xs text-gray-400 font-normal">{l.preventivas} preventivas · {l.corretivas} corretivas</span></Td>
                  <Td dir>{l.total}</Td><Td dir>{l.concluidas}</Td><Td dir>{l.emAberto}</Td>
                  <Td dir><span className={l.atrasadas ? 'text-red-600 font-medium' : ''}>{l.atrasadas}</span></Td>
                  <Td dir>{pct(l.taxaConclusao)}</Td><Td dir>{pct(l.noPrazo)}</Td>
                  <Td dir>{l.tempoMedioDias} d</Td><Td dir>{l.equipamentosAtendidos}</Td><Td dir>{l.osPorDia ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        <p className="text-xs text-gray-400 mt-3">"No dia" = concluídas na própria data agendada ou antes. "Tempo médio" = dias entre a data agendada e a conclusão.</p>
      </Cartao>
    </div>
  )
}
