import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsActionsMenu } from '@/components/ui/os-actions-menu'
import {
  MapPin, User, Calendar, Clock, CheckSquare, Wrench,
  FileText, DollarSign, ClipboardCheck, AlertCircle, Wind, Activity,
} from 'lucide-react'
import { ConcluirOsBtn } from '@/components/ui/concluir-os-btn'
import { LgmvUpload } from '@/components/ui/lgmv-upload'

type Props = { params: Promise<{ id: string }> }

type ChecklistItem = {
  ordem: number
  tarefa: string
  obrigatorio: boolean
  tipo: 'checkbox' | 'numero' | 'texto'
  valor?: string | number | boolean | null
}

type OsItem = {
  id: string
  statusItem: 'pendente' | 'concluido'
  checklistSnapshot: ChecklistItem[]
  observacoesTecnicas: string | null
  equipamento: {
    id: string
    nome: string
    tipoEquipamento: string
    marca: string
    modelo: string | null
    numeroSerie: string | null
  }
}

type Tecnico = { id: string; email: string; nome: string | null }

type OrdemServico = {
  id: string
  numero: number | null
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  dataInicio: string | null
  dataConclusao: string | null
  valorMaoObra: number | null
  valorPecas: number | null
  observacoesGerais: string | null
  assinaturaBase64: string | null
  tipoGas: string | null
  quantidadeGasGramas: number | null
  ambiente: {
    id: string
    nome: string
    localizacaoInterna: string
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  }
  tecnico: Tecnico | null
  itens: OsItem[]
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Manual (Admin)',
  preventiva_automatica: 'Preventiva Automática',
  portal_cliente:        'Portal do Cliente',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtBRL(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function ItemChecklistRow({ item }: { item: ChecklistItem }) {
  const valorStr = item.valor == null ? '' : String(item.valor)
  const hasValue = valorStr !== '' && valorStr !== 'false'

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-gray-300 w-5 shrink-0 text-right pt-0.5">{item.ordem}.</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700">
          {item.tarefa}
          {item.obrigatorio && <span className="text-destructive ml-1 text-xs">*</span>}
        </span>
      </div>
      <div className="shrink-0 text-right">
        {item.tipo === 'checkbox' ? (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            item.valor === true || item.valor === 'true'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {item.valor === true || item.valor === 'true' ? '✓ Feito' : '— Pendente'}
          </span>
        ) : hasValue ? (
          <span className="text-sm font-semibold text-gray-800">{valorStr}</span>
        ) : (
          <span className="text-xs text-gray-300 italic">sem valor</span>
        )}
      </div>
    </div>
  )
}

export default async function OsDetailPage({ params }: Props) {
  const { id } = await params

  let os: OrdemServico
  let tecnicos: Tecnico[] = []

  try {
    const [osData, tecnicosRes] = await Promise.all([
      api.get<OrdemServico>(`/ordens-servico/${id}`),
      api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    ])
    os       = osData
    tecnicos = tecnicosRes.data
  } catch {
    notFound()
  }

  const osNum    = os.numero != null ? `OS-${String(os.numero).padStart(4,'0')}` : `OS-${os.id.slice(0,6).toUpperCase()}`
  const cliente  = os.ambiente?.cliente
  const clienteNome = cliente?.nomeFantasia ?? cliente?.razaoSocial ?? '—'

  const itensConcluidos = os.itens.filter((i) => i.statusItem === 'concluido').length
  const totalItens      = os.itens.length
  const totalMaoObra    = os.valorMaoObra ?? 0
  const totalPecas      = os.valorPecas   ?? 0
  const totalCusto      = totalMaoObra + totalPecas

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/ordens-servico" className="text-gray-500 hover:text-primary transition-colors">
          Ordens de Serviço
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{osNum}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck size={22} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{osNum}</h1>
                <StatusBadge status={os.status} />
              </div>
              <p className="text-sm text-gray-500">{ORIGEM_LABEL[os.origem] ?? os.origem}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {(os.status === 'em_andamento' || os.status === 'agendada') && (
              <ConcluirOsBtn osId={os.id} osNum={osNum} />
            )}
            {os.status !== 'concluida' && os.status !== 'cancelada' && (
              <a
                href={`/ordens-servico/${os.id}/editar`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 border border-border rounded-lg hover:bg-surface transition-colors"
              >
                Editar
              </a>
            )}
            <a
              href={`/ordens-servico/${os.id}/pdf`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <FileText size={14} />
              PDF
            </a>
            <OsActionsMenu
              osId={os.id}
              status={os.status}
              tecnicos={tecnicos}
              valorMaoObra={os.valorMaoObra}
              valorPecas={os.valorPecas}
            />
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <MapPin size={10} /> Ambiente
            </p>
            <p className="text-sm font-semibold text-gray-800">{os.ambiente?.nome ?? '—'}</p>
            <p className="text-xs text-gray-400">{clienteNome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <User size={10} /> Técnico
            </p>
            <p className="text-sm font-semibold text-gray-800">
              {os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : <span className="italic text-gray-400">Não atribuído</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Calendar size={10} /> Agendamento
            </p>
            <p className="text-sm font-semibold text-gray-800">{fmtDate(os.dataAgendamento)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Clock size={10} /> Conclusão
            </p>
            <p className="text-sm font-semibold text-gray-800">{fmtDate(os.dataConclusao)}</p>
          </div>
        </div>

        {os.observacoesGerais && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <AlertCircle size={10} /> Observações Gerais
            </p>
            <p className="text-sm text-gray-700">{os.observacoesGerais}</p>
          </div>
        )}
      </div>

      {/* Financeiro */}
      {(os.valorMaoObra != null || os.valorPecas != null) && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <DollarSign size={10} /> Mão de Obra
            </p>
            <p className="text-lg font-bold text-gray-900">{fmtBRL(os.valorMaoObra)}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <DollarSign size={10} /> Peças
            </p>
            <p className="text-lg font-bold text-gray-900">{fmtBRL(os.valorPecas)}</p>
          </div>
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 shadow-sm">
            <p className="text-xs text-primary/70 mb-1">Total da O.S.</p>
            <p className="text-lg font-bold text-primary">{fmtBRL(totalCusto)}</p>
          </div>
        </div>
      )}

      {/* Itens / Checklist por equipamento */}
      <div>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
          <CheckSquare size={16} className="text-primary" />
          Equipamentos e Checklists
          <span className="text-xs font-normal text-gray-400">
            ({itensConcluidos}/{totalItens} concluído{totalItens !== 1 ? 's' : ''})
          </span>
        </h2>

        {/* Dados de gás e assinatura — visíveis quando preenchidos */}
        {(os.tipoGas || os.assinaturaBase64) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            {os.tipoGas && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 shadow-sm">
                <p className="text-xs text-blue-500 mb-1 flex items-center gap-1">
                  <Wind size={11} /> Carga de Gás Refrigerante
                </p>
                <p className="text-sm font-bold text-blue-800">{os.tipoGas}</p>
                {os.quantidadeGasGramas != null && (
                  <p className="text-xs text-blue-600 mt-0.5">{Number(os.quantidadeGasGramas).toFixed(1)} g</p>
                )}
              </div>
            )}
            {os.assinaturaBase64 && (
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">Assinatura do Responsável</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={os.assinaturaBase64}
                  alt="Assinatura"
                  className="max-h-16 w-auto border border-border rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* Diagnósticos LGMV por equipamento */}
        {os.itens.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <Activity size={14} className="text-primary" />
              Diagnósticos LGMV
              <span className="text-xs font-normal text-gray-400">— Faça upload dos arquivos IDU/ODU por equipamento</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {os.itens.map((item) => (
                <LgmvUpload
                  key={item.id}
                  equipamentoId={item.equipamento.id}
                  equipamentoNome={item.equipamento.nome}
                  osId={os.id}
                />
              ))}
            </div>
          </div>
        )}

        {os.itens.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
            <Wrench size={32} className="mx-auto text-primary/20 mb-3" />
            <p className="text-sm text-gray-500">Nenhum item de checklist nesta O.S.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {os.itens.map((item) => {
              const eq = item.equipamento
              const checklist = Array.isArray(item.checklistSnapshot) ? item.checklistSnapshot : []
              const concluido = item.statusItem === 'concluido'

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  {/* Equipment header */}
                  <div className={`px-5 py-3 flex items-center justify-between border-b border-border ${concluido ? 'bg-green-50' : 'bg-surface'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${concluido ? 'bg-green-500' : 'bg-yellow-400'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{eq.nome}</p>
                        <p className="text-xs text-gray-400">
                          {eq.tipoEquipamento} · {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                          {eq.numeroSerie && ` · S/N: ${eq.numeroSerie}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      concluido
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {concluido ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>

                  {/* Checklist items */}
                  {checklist.length > 0 ? (
                    <div className="px-5 py-2">
                      {checklist.map((ci) => (
                        <ItemChecklistRow key={ci.ordem} item={ci} />
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-sm text-gray-400 italic">Sem checklist definido.</p>
                  )}

                  {/* Observações do técnico */}
                  {item.observacoesTecnicas && (
                    <div className="px-5 py-3 bg-amber-50 border-t border-border">
                      <p className="text-xs text-amber-600 font-semibold mb-0.5">Obs. do Técnico</p>
                      <p className="text-sm text-amber-800">{item.observacoesTecnicas}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
