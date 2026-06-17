import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Building2, Cpu, ChevronRight, DollarSign, ClipboardList,
  CalendarClock, FileText, AlertTriangle, CheckCircle,
} from 'lucide-react'

type Equipamento = { id: string; nome: string; tipoEquipamento: string; marca: string; modelo: string | null; numeroSerie: string | null }
type Ambiente = { id: string; nome: string; localizacaoInterna: string; metrosQuadrados: number; capacidadeTermica: string; equipamentos: Equipamento[] }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string; ambientes: Ambiente[] }
type Contrato = { id: string; descricao: string; valorMensal: number | null; vigenciaInicio: string; vigenciaFim: string; numOsIncluidas: number | null; ativo: boolean }
type OsResumo = { id: string; numero: number | null; status: string; tipo: string; dataAgendamento: string; dataConclusao: string | null; ambiente: { nome: string }; tecnico: { nome: string | null; email: string } | null }
type Dashboard = {
  porStatus: Record<string, number>
  custoTotalGeral: number
  osDoMes: number
  contrato: Contrato | null
  proximaOs: { id: string; dataAgendamento: string; tipo: string; ambiente: { nome: string } } | null
  ultimasOs: OsResumo[]
  totalAmbientes: number
  totalEquipamentos: number
}

type Props = { params: Promise<{ id: string }> }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params

  let cliente: Cliente | undefined
  let dash: Dashboard | undefined
  try {
    ;[cliente, dash] = await Promise.all([
      api.get<Cliente>(`/clientes/${id}`),
      api.get<Dashboard>(`/clientes/${id}/dashboard`),
    ])
  } catch {
    /* empty */
  }
  if (!cliente || !dash) notFound()

  const totalOs = Object.values(dash.porStatus).reduce((s, n) => s + n, 0)
  const contratoAtivo = dash.contrato
  const diasVigencia = contratoAtivo
    ? Math.ceil((new Date(contratoAtivo.vigenciaFim).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/clientes" className="text-gray-500 hover:text-primary transition-colors">← Clientes</a>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-700 font-medium">{cliente.nomeFantasia ?? cliente.razaoSocial}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{cliente.razaoSocial}</h1>
          {cliente.nomeFantasia && <p className="text-gray-400 text-sm mt-0.5">{cliente.nomeFantasia}</p>}
          <p className="text-gray-500 text-sm mt-1 font-mono">{cliente.documento}</p>
          <p className="text-gray-400 text-xs mt-0.5">{cliente.endereco}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/contratos/novo?clienteId=${id}`}
            className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            + Contrato
          </a>
          <a href={`/clientes/${id}/editar`}
            className="px-3 py-2 text-xs font-semibold border border-border text-gray-600 rounded-lg hover:bg-surface transition-colors">
            Editar
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Total de O.S.</p>
          <p className="text-2xl font-bold text-primary">{totalOs}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={10} /> Custo Total</p>
          <p className="text-2xl font-bold text-gray-900">{fmtBRL(dash.custoTotalGeral)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">O.S. este mês</p>
          <p className="text-2xl font-bold text-gray-900">{dash.osDoMes}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${
          diasVigencia != null && diasVigencia <= 30 ? 'bg-red-50 border-red-200' :
          diasVigencia != null && diasVigencia <= 60 ? 'bg-yellow-50 border-yellow-200' :
          'bg-white border-border'
        }`}>
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><FileText size={10} /> Contrato</p>
          {contratoAtivo ? (
            <>
              <p className={`text-sm font-bold ${diasVigencia! <= 30 ? 'text-red-600' : diasVigencia! <= 60 ? 'text-yellow-700' : 'text-gray-800'}`}>
                {diasVigencia! > 0 ? `${diasVigencia}d restantes` : 'Vencido'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">até {fmtDate(contratoAtivo.vigenciaFim)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Sem contrato</p>
          )}
        </div>
      </div>

      {/* Status das O.S. */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { key: 'aberta', label: 'Abertas', color: 'text-blue-600 bg-blue-50' },
          { key: 'agendada', label: 'Agendadas', color: 'text-orange-600 bg-orange-50' },
          { key: 'em_andamento', label: 'Andamento', color: 'text-purple-600 bg-purple-50' },
          { key: 'concluida', label: 'Concluídas', color: 'text-green-600 bg-green-50' },
          { key: 'cancelada', label: 'Canceladas', color: 'text-red-600 bg-red-50' },
        ].map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl p-3 text-center border border-transparent ${color.split(' ')[1]} border-${color.split(' ')[0].replace('text-', '')}/20`}>
            <p className={`text-xl font-bold ${color.split(' ')[0]}`}>{dash.porStatus[key] ?? 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Próxima O.S. + Contrato detalhe */}
      {(dash.proximaOs || contratoAtivo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {dash.proximaOs && (
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><CalendarClock size={11} /> Próxima Manutenção</p>
              <p className="font-bold text-gray-800">{fmtDate(dash.proximaOs.dataAgendamento)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dash.proximaOs.ambiente.nome} · {dash.proximaOs.tipo}</p>
              <a href={`/ordens-servico/${dash.proximaOs.id}`} className="text-xs text-primary font-semibold hover:underline mt-1 block">
                Ver O.S. →
              </a>
            </div>
          )}
          {contratoAtivo && (
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><FileText size={11} /> Contrato Ativo</p>
              <p className="font-bold text-gray-800 truncate">{contratoAtivo.descricao}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmtDate(contratoAtivo.vigenciaInicio)} → {fmtDate(contratoAtivo.vigenciaFim)}
                {contratoAtivo.valorMensal != null && ` · ${fmtBRL(Number(contratoAtivo.valorMensal))}/mês`}
              </p>
              {contratoAtivo.numOsIncluidas != null && (
                <p className="text-xs text-gray-400 mt-0.5">{contratoAtivo.numOsIncluidas} O.S. inclusas/mês</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Últimas O.S. */}
      {dash.ultimasOs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList size={14} className="text-primary" /> Últimas O.S.
            </p>
            <a href={`/ordens-servico?clienteId=${id}`} className="text-xs text-primary font-semibold hover:underline">
              Ver todas
            </a>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nº</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Tipo</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Ambiente</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Técnico</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Agendamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dash.ultimasOs.map((os) => {
                const num = os.numero != null ? `OS-${String(os.numero).padStart(4,'0')}` : `OS-${os.id.slice(0,6).toUpperCase()}`
                return (
                  <tr key={os.id} className="hover:bg-surface/60">
                    <td className="px-5 py-2.5">
                      <a href={`/ordens-servico/${os.id}`} className="font-mono text-primary font-semibold hover:underline">{num}</a>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={os.status as any} /></td>
                    <td className="px-3 py-2.5 text-gray-500 capitalize">{os.tipo}</td>
                    <td className="px-3 py-2.5 text-gray-600">{os.ambiente.nome}</td>
                    <td className="px-3 py-2.5 text-gray-500">{os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500">{fmtDate(os.dataAgendamento)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Árvore de ambientes */}
      <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Building2 size={15} className="text-primary" /> Ambientes e Equipamentos
      </h2>
      {cliente.ambientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum ambiente vinculado.</p>
          <a href="/ambientes/novo" className="mt-3 inline-block text-sm text-primary font-semibold hover:underline">Criar ambiente</a>
        </div>
      ) : (
        <div className="space-y-4">
          {cliente.ambientes.map((amb) => (
            <div key={amb.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-primary" />
                  <span className="font-semibold text-gray-800 text-sm">{amb.nome}</span>
                  <span className="text-xs text-gray-400">· {amb.localizacaoInterna}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{Number(amb.metrosQuadrados).toFixed(0)} m²</span>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <Cpu size={11} />{amb.equipamentos.length} eq.
                  </span>
                  <a href={`/ambientes/${amb.id}/editar`} className="text-primary font-semibold hover:underline">Editar</a>
                </div>
              </div>
              {amb.equipamentos.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-400 italic">Nenhum equipamento.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Tipo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Marca/Modelo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Nº Série</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {amb.equipamentos.map((eq) => (
                      <tr key={eq.id} className="hover:bg-surface/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{eq.nome}</td>
                        <td className="px-4 py-2.5 text-gray-500">{eq.tipoEquipamento}</td>
                        <td className="px-4 py-2.5 text-gray-500">{eq.marca}{eq.modelo ? ` ${eq.modelo}` : ''}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono">{eq.numeroSerie ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <a href={`/equipamentos/${eq.id}/editar`} className="text-primary font-semibold hover:underline">Editar</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
