import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { buscarRelatorio, queryDoRelatorio, type Filtros } from './dados'

type Props = { searchParams: Promise<Filtros> }
type Opcao = { id: string; nome: string | null; email?: string; razaoSocial?: string; nomeFantasia?: string | null }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const fmtData = (s: string) => s.split('-').reverse().join('/')
const fmtMes = (s: string) => {
  const [a, m] = s.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(m) - 1]}/${a.slice(2)}`
}
const fmtHoras = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function atalhos() {
  const hoje = new Date()
  const y = hoje.getFullYear(), m = hoje.getMonth()
  const dia = (a: number, b: number, c: number) => iso(new Date(Date.UTC(a, b, c)))
  return [
    { label: 'Este mês', inicio: dia(y, m, 1), fim: iso(hoje) },
    { label: 'Mês passado', inicio: dia(y, m - 1, 1), fim: dia(y, m, 0) },
    { label: 'Últimos 90 dias', inicio: iso(new Date(hoje.getTime() - 89 * 86_400_000)), fim: iso(hoje) },
    { label: 'Este ano', inicio: dia(y, 0, 1), fim: iso(hoje) },
  ]
}

export default async function RelatorioAgendaPage({ searchParams }: Props) {
  const f = await searchParams
  let motivo = ''
  const [relatorio, tecnicosRes, clientesRes] = await Promise.all([
    buscarRelatorio(f).catch((e: unknown) => { motivo = e instanceof Error ? e.message : ''; return null }),
    api.get<{ data: Opcao[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Opcao[] })),
    api.get<{ data: Opcao[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as Opcao[] })),
  ])

  if (!relatorio) {
    return (
      <div>
        <Link href="/agenda" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Agenda</Link>
        <h1 className="text-xl font-semibold text-gray-900">Relatório de atendimentos</h1>
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 max-w-xl">
          Não foi possível gerar o relatório. Confira as datas e tente de novo.
          {motivo && <span className="block text-xs text-red-600 mt-1">Detalhe: {motivo}</span>}
        </p>
      </div>
    )
  }

  const { periodo, total, tipos, tecnicos, meses } = relatorio
  const maxTotal = Math.max(1, ...tipos.map((t) => t.total))
  const colunas = tipos.map((t) => ({ chave: t.chave, sigla: t.sigla, nome: t.nome, corHex: t.corHex }))
  const atual = { inicio: periodo.inicio, fim: periodo.fim, tecnicoId: f.tecnicoId, clienteId: f.clienteId }
  const hrefCsv = `/agenda/relatorio/csv${queryDoRelatorio(atual)}`

  const Cel = ({ n, destaque }: { n: number | undefined; destaque?: boolean }) => (
    <td className={`px-3 py-2 text-right tabular-nums ${n ? (destaque ? 'text-red-700 font-semibold' : 'text-gray-900') : 'text-gray-300'}`}>{n || '–'}</td>
  )

  return (
    <div className="max-w-6xl">
      <Link href="/agenda" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Agenda
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Relatório de atendimentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quantos atendimentos de cada tipo, de {fmtData(periodo.inicio)} a {fmtData(periodo.fim)}. Conta os eventos da agenda que começam no período.
          </p>
        </div>
        <a href={hrefCsv} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-white border border-border rounded-md hover:bg-surface">
          <Download size={14} /> Baixar planilha
        </a>
      </div>

      {/* Filtros */}
      <form method="get" className="bg-white border border-border rounded-lg p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {atalhos().map((a) => (
            <Link key={a.label}
              href={`/agenda/relatorio${queryDoRelatorio({ inicio: a.inicio, fim: a.fim, tecnicoId: f.tecnicoId, clienteId: f.clienteId })}`}
              className={`px-3 py-1 text-sm rounded-md border ${periodo.inicio === a.inicio && periodo.fim === a.fim ? 'bg-primary text-white border-primary' : 'border-border text-gray-700 hover:bg-surface'}`}>
              {a.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-gray-600">De
            <input type="date" name="inicio" defaultValue={periodo.inicio} className="block mt-1 px-3 py-1.5 border border-border rounded-md text-sm" />
          </label>
          <label className="text-sm text-gray-600">Até
            <input type="date" name="fim" defaultValue={periodo.fim} className="block mt-1 px-3 py-1.5 border border-border rounded-md text-sm" />
          </label>
          <label className="text-sm text-gray-600">Técnico
            <select name="tecnicoId" defaultValue={f.tecnicoId ?? ''} className="block mt-1 px-3 py-1.5 border border-border rounded-md text-sm bg-white min-w-[160px]">
              <option value="">Todos</option>
              {tecnicosRes.data.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-600">Cliente
            <select name="clienteId" defaultValue={f.clienteId ?? ''} className="block mt-1 px-3 py-1.5 border border-border rounded-md text-sm bg-white min-w-[180px] max-w-[260px]">
              <option value="">Todos</option>
              {clientesRes.data.map((c) => <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>)}
            </select>
          </label>
          <button type="submit" className="px-4 py-1.5 text-sm font-semibold text-white bg-action rounded-md hover:bg-action/90">Aplicar</button>
        </div>
      </form>

      {relatorio.truncado && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          O período tem eventos demais e a contagem foi limitada. Escolha um período menor.
        </p>
      )}

      {total === 0 ? (
        <div className="bg-white border border-border rounded-lg p-10 text-center text-sm text-gray-500">
          Nenhum atendimento na agenda nesse período.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Resumo */}
          <div className="bg-white border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border">
              {[
                { l: 'Atendimentos', v: total },
                { l: 'Horas na agenda', v: `${String(relatorio.horas).replace('.', ',')}h` },
                { l: 'Preventivas e PMOC', v: relatorio.resumo.preventivas },
                { l: 'Corretivas', v: relatorio.resumo.corretivas },
              ].map((k) => (
                <div key={k.l} className="bg-white px-4 py-3.5">
                  <p className="text-sm text-gray-500">{k.l}</p>
                  <p className="text-2xl font-semibold tabular-nums text-gray-900 mt-0.5">{k.v}</p>
                </div>
              ))}
              <div className={`px-4 py-3.5 ${relatorio.retrabalho.total > 0 ? 'bg-red-50' : 'bg-white'}`}>
                <p className="text-sm text-gray-500">Retrabalho</p>
                <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${relatorio.retrabalho.total > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {relatorio.retrabalho.total}
                  <span className="text-sm font-normal text-gray-500 ml-1.5">{String(relatorio.retrabalho.percentual).replace('.', ',')}% do total</span>
                </p>
              </div>
            </div>
          </div>

          {/* Por tipo */}
          <section className="bg-white border border-border rounded-lg overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-gray-800 border-b border-border">Atendimentos por tipo</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-border">
                  <th className="px-4 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Atendimentos</th>
                  <th className="px-3 py-2 font-medium text-left w-40 hidden md:table-cell">Participação</th>
                  <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Concluídos</th>
                  <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Agendados</th>
                  <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">Em andamento</th>
                  <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">Cancelados</th>
                  <th className="px-3 py-2 text-right font-medium">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {tipos.map((t) => (
                  <tr key={t.chave} className={t.sigla === 'RT' ? 'bg-red-50/60' : ''}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.corHex }} />
                        <span className="font-medium text-gray-900">{t.nome}</span>
                        <span className="text-gray-500 font-mono text-xs">{t.sigla}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">{t.total}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(t.total / maxTotal) * 100}%`, backgroundColor: t.corHex }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{String(t.percentual).replace('.', ',')}%</span>
                      </div>
                    </td>
                    <Cel n={t.concluidos} />
                    <Cel n={t.agendados} />
                    <Cel n={t.emAndamento} />
                    <Cel n={t.cancelados} />
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{fmtHoras(t.minutos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Por técnico */}
          <section className="bg-white border border-border rounded-lg overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-gray-800 border-b border-border">Por técnico</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">Técnico</th>
                    {colunas.map((c) => <th key={c.chave} className="px-3 py-2 text-right font-medium" title={c.nome}>{c.sigla}</th>)}
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {tecnicos.map((t) => (
                    <tr key={t.id ?? 'sem'}>
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{t.nome}</td>
                      {colunas.map((c) => <Cel key={c.chave} n={t.porTipo[c.chave]} destaque={c.sigla === 'RT'} />)}
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Por mês */}
          <section className="bg-white border border-border rounded-lg overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-gray-800 border-b border-border">Por mês</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">Mês</th>
                    {colunas.map((c) => <th key={c.chave} className="px-3 py-2 text-right font-medium" title={c.nome}>{c.sigla}</th>)}
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {meses.map((m) => (
                    <tr key={m.mes}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{fmtMes(m.mes)}</td>
                      {colunas.map((c) => <Cel key={c.chave} n={m.porTipo[c.chave]} destaque={c.sigla === 'RT'} />)}
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">{m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-gray-500">
            Siglas: {colunas.map((c) => `${c.sigla} = ${c.nome}`).join(' · ')}. Retrabalho é o tipo “Retrabalho” (RT) escolhido no evento ou na O.S.
          </p>
        </div>
      )}
    </div>
  )
}
