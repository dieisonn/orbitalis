import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { ArrowLeft, Cpu, ClipboardCheck } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean; marcado: boolean }

type OsItem = {
  id: string
  statusItem: string
  observacoesTecnicas: string | null
  checklistSnapshot: ChecklistItem[] | null
  equipamento: { id: string; nome: string; tipoEquipamento: string }
}

type Os = {
  id: string
  numero: number | null
  status: string
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
  observacoesGerais: string | null
  assinaturaBase64: string | null
  ambiente: { nome: string; localizacaoInterna: string | null }
  tecnico: { nome: string | null; email: string } | null
  tipoServico: { nome: string } | null
  itens: OsItem[]
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Programada',
  preventiva_automatica: 'Preventiva automática',
  portal_cliente:        'Solicitada por você',
}

const STATUS_ITEM_LABEL: Record<string, string> = {
  pendente:  'Pendente',
  concluido: 'Concluído',
}

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function OsClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let os: Os | null = null
  try {
    os = await api.get<Os>(`/ordens-servico/${id}`)
  } catch {}

  if (!os) notFound()

  const checklistTotal = os.itens.reduce(
    (acc, item) => acc + (item.checklistSnapshot?.length ?? 0), 0,
  )
  const checklistDone = os.itens.reduce(
    (acc, item) =>
      acc + (item.checklistSnapshot?.filter((c) => c.marcado).length ?? 0),
    0,
  )

  return (
    <div className="max-w-2xl space-y-5">

      {/* Voltar */}
      <Link
        href="/historico"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Voltar ao histórico
      </Link>

      {/* Cabeçalho */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              {ORIGEM_LABEL[os.origem] ?? os.origem}
              {os.tipoServico ? ` · ${os.tipoServico.nome}` : ''}
            </p>
            <h1 className="text-xl font-bold text-gray-900">
              {os.ambiente.nome}
            </h1>
            {os.ambiente.localizacaoInterna && (
              <p className="text-sm text-gray-400 mt-0.5">{os.ambiente.localizacaoInterna}</p>
            )}
          </div>
          <StatusBadge status={os.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Agendado para</p>
            <p className="text-gray-700 font-medium">{fmtData(os.dataAgendamento)}</p>
          </div>
          {os.dataConclusao && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Concluído em</p>
              <p className="text-gray-700 font-medium">{fmtData(os.dataConclusao)}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Técnico</p>
            <p className="text-gray-700 font-medium">
              {os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : 'Aguardando atribuição'}
            </p>
          </div>
          {checklistTotal > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Checklist</p>
              <p className="text-gray-700 font-medium">
                {checklistDone}/{checklistTotal} itens concluídos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Equipamentos / Itens */}
      {os.itens.length > 0 && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Cpu size={14} className="text-primary" />
              Equipamentos ({os.itens.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {os.itens.map((item) => {
              const done = item.checklistSnapshot?.filter((c) => c.marcado).length ?? 0
              const total = item.checklistSnapshot?.length ?? 0
              return (
                <div key={item.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.equipamento.nome}</p>
                      <p className="text-xs text-gray-400">{item.equipamento.tipoEquipamento}</p>
                    </div>
                    <span className={[
                      'text-[11px] font-semibold px-2.5 py-1 rounded-full',
                      item.statusItem === 'concluido'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700',
                    ].join(' ')}>
                      {STATUS_ITEM_LABEL[item.statusItem] ?? item.statusItem}
                    </span>
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {done}/{total} itens do checklist marcados
                    </p>
                  )}
                  {item.observacoesTecnicas && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">
                      Obs.: {item.observacoesTecnicas}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Observações gerais */}
      {os.observacoesGerais && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <ClipboardCheck size={14} className="text-primary" />
            Observações gerais
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{os.observacoesGerais}</p>
        </div>
      )}

      {/* Assinatura */}
      {os.assinaturaBase64 && (
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Assinatura do técnico</p>
          <img
            src={os.assinaturaBase64}
            alt="Assinatura"
            className="max-h-28 border border-border rounded-lg p-2 bg-gray-50"
          />
        </div>
      )}

    </div>
  )
}
