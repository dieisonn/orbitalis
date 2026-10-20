import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsExecucao, type OsParaExecucao } from './os-execucao'
import { ArrowLeft, MapPin, Building2, Calendar, Package, Navigation, Phone } from 'lucide-react'
import { mapaUrl, wazeUrl } from '@/lib/agenda'

type Props = { params: Promise<{ id: string }> }

type OrdemServico = OsParaExecucao & {
  origem: string
  dataAgendamento: string
  dataInicio: string | null
  dataConclusao: string | null
  observacoesGerais: string | null
  assinaturaBase64: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null; endereco: string; telefone: string | null }
  }
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual (Admin)',
  preventiva_automatica: 'Preventiva Automática',
  portal_cliente: 'Portal Cliente',
  orcamento_aprovado: 'Orçamento aprovado',
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
        <p className="text-gray-400 text-sm">O.S. não encontrada ou sem permissão de acesso.</p>
        <a href="/minhas-os" className="text-primary text-sm underline mt-2 block">
          ← Voltar para Minhas O.S.
        </a>
      </div>
    )
  }

  const shortId = `OS-${os.id.slice(0, 6).toUpperCase()}`
  const cliente = os.ambiente.cliente.nomeFantasia ?? os.ambiente.cliente.razaoSocial

  return (
    <div className="space-y-4">
      {/* Voltar */}
      <a
        href="/minhas-os"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Minhas O.S.
      </a>

      {/* Cabeçalho da O.S. */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-gray-400">{shortId}</p>
            <h1 className="text-lg font-bold text-primary mt-0.5 truncate">
              {os.ambiente.nome}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {ORIGEM_LABEL[os.origem] ?? os.origem}
            </p>
          </div>
          <StatusBadge
            status={
              os.status as
                | 'aberta'
                | 'agendada'
                | 'em_andamento'
                | 'concluida'
                | 'cancelada'
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <Building2 size={12} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Cliente</p>
              <p className="font-medium text-gray-700">{cliente}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={12} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Localização</p>
              <p className="font-medium text-gray-700">{os.ambiente.localizacaoInterna}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={12} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Agendamento</p>
              <p className="font-medium text-gray-700">{fmt(os.dataAgendamento)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package size={12} className="text-primary/40 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Equipamentos</p>
              <p className="font-medium text-gray-700">{os.itens.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 bg-surface rounded-lg p-3 text-xs">
          <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Endereço do atendimento</p>
          <p className="font-medium text-gray-700">{os.ambiente.cliente.endereco}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <a href={mapaUrl(os.ambiente.cliente.endereco)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action text-white font-semibold rounded-lg">
              <Navigation size={12} /> Abrir no mapa
            </a>
            <a href={wazeUrl(os.ambiente.cliente.endereco)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 font-semibold rounded-lg">
              Waze
            </a>
            {os.ambiente.cliente.telefone && (
              <a href={`tel:${os.ambiente.cliente.telefone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 font-semibold rounded-lg">
                <Phone size={12} /> Ligar
              </a>
            )}
          </div>
        </div>

        {os.observacoesGerais && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-bold uppercase tracking-wide text-gray-400 mb-1 text-[10px]">
              Obs. Gerais
            </p>
            {os.observacoesGerais}
          </div>
        )}

        {os.status === 'concluida' && os.assinaturaBase64 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
              Assinatura do cliente
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={os.assinaturaBase64}
              alt="Assinatura"
              className="h-16 border rounded-lg bg-white"
            />
          </div>
        )}
      </div>

      {/* Parte interativa */}
      <OsExecucao
        os={{ id: os.id, status: os.status, itens: os.itens }}
      />
    </div>
  )
}
