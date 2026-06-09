import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsStatusButtons } from './status-buttons'
import { ArrowLeft, MapPin, Building2, Calendar, Package } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

type ChecklistItem = {
  id: string
  descricao: string
  obrigatorio: boolean
}

type OsItem = {
  id: string
  statusItem: string
  observacoesTecnicas: string | null
  checklistSnapshot: unknown
  equipamento: {
    nome: string
    marca: string
    modelo: string | null
    tipoEquipamento: string
    codigoQr: string
    numeroSerie: string | null
  }
}

type OrdemServico = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  dataInicio: string | null
  dataConclusao: string | null
  observacoesGerais: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  }
  tecnico: { email: string } | null
  itens: OsItem[]
}

function parseSnapshot(snapshot: unknown): ChecklistItem[] {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) return snapshot as ChecklistItem[]
  try {
    const parsed = JSON.parse(String(snapshot))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual (Admin)',
  preventiva_automatica: 'Preventiva Automática',
  portal_cliente: 'Portal Cliente',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default async function OsDetailPage({ params }: Props) {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const { id } = await params

  let os: OrdemServico | null = null
  try {
    os = await api.get<OrdemServico>(`/ordens-servico/${id}`)
  } catch {
    // not found or forbidden
  }

  if (!os) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">O.S. não encontrada ou sem permissão de acesso.</p>
        <a href="/minhas-os" className="text-primary text-sm underline mt-2 block">
          ← Voltar para Minhas O.S.
        </a>
      </div>
    )
  }

  const shortId = `OS-${os.id.slice(0, 6).toUpperCase()}`
  const cliente = os.ambiente.cliente.nomeFantasia ?? os.ambiente.cliente.razaoSocial
  const canChangeStatus = os.status !== 'concluida' && os.status !== 'cancelada'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Voltar */}
      <a
        href="/minhas-os"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Minhas O.S.
      </a>

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-gray-400">{shortId}</p>
            <h1 className="text-xl font-bold text-primary mt-0.5">{os.ambiente.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{ORIGEM_LABEL[os.origem] ?? os.origem}</p>
          </div>
          <StatusBadge status={os.status as 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <Building2 size={13} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Cliente</p>
              <p className="font-medium text-gray-700">{cliente}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Localização</p>
              <p className="font-medium text-gray-700">{os.ambiente.localizacaoInterna}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={13} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Agendamento</p>
              <p className="font-medium text-gray-700">{fmt(os.dataAgendamento)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package size={13} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Equipamentos</p>
              <p className="font-medium text-gray-700">{os.itens.length}</p>
            </div>
          </div>
        </div>

        {os.observacoesGerais && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-bold uppercase tracking-wide text-gray-400 mb-1">Observações Gerais</p>
            {os.observacoesGerais}
          </div>
        )}
      </div>

      {/* Equipamentos e checklists */}
      {os.itens.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">
            Equipamentos ({os.itens.length})
          </p>
          {os.itens.map((item, idx) => {
            const checklist = parseSnapshot(item.checklistSnapshot)
            return (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{idx + 1} · {item.equipamento.tipoEquipamento}</p>
                    <p className="font-semibold text-gray-800">{item.equipamento.nome}</p>
                    <p className="text-xs text-gray-400">
                      {item.equipamento.marca}
                      {item.equipamento.modelo ? ` ${item.equipamento.modelo}` : ''}
                    </p>
                    {item.equipamento.numeroSerie && (
                      <p className="text-xs font-mono text-gray-400">S/N: {item.equipamento.numeroSerie}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    item.statusItem === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.statusItem === 'concluido' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>

                {checklist.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Checklist</p>
                    <div className="space-y-1.5">
                      {checklist.map((ci) => (
                        <div key={ci.id} className="flex items-start gap-2">
                          <div className="mt-0.5 w-3.5 h-3.5 border border-gray-300 rounded-sm shrink-0 bg-white" />
                          <span className="text-xs text-gray-700">
                            {ci.descricao}
                            {ci.obrigatorio && <span className="text-destructive ml-1 text-[9px]">*</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.observacoesTecnicas && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Observações</p>
                    <p className="text-xs text-gray-600">{item.observacoesTecnicas}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Botões de status */}
      {canChangeStatus && (
        <OsStatusButtons osId={os.id} currentStatus={os.status} />
      )}
    </div>
  )
}
