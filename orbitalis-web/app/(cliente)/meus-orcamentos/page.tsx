import { api } from '@/lib/api'
import Link from 'next/link'
import { ReceiptText, ExternalLink, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react'

type OrcamentoItem = { id: string; quantidade: number; precoUnitario: number }

type Orcamento = {
  id: string
  numero: number
  titulo: string
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado'
  validadeDias: number
  tokenPublico: string
  criadoEm: string
  aprovadoEm: string | null
  rejeitadoEm: string | null
  observacoes: string | null
  itens: OrcamentoItem[]
  criadoPor: { nome: string }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; class: string }
> = {
  rascunho:  { label: 'Rascunho',  icon: FileText,     class: 'bg-gray-100 text-gray-600' },
  enviado:   { label: 'Aguardando aprovação', icon: Clock, class: 'bg-amber-100 text-amber-700' },
  aprovado:  { label: 'Aprovado',  icon: CheckCircle2, class: 'bg-green-100 text-green-700' },
  rejeitado: { label: 'Rejeitado', icon: XCircle,      class: 'bg-red-100 text-red-600' },
  expirado:  { label: 'Expirado',  icon: Clock,        class: 'bg-gray-100 text-gray-500' },
}

function totalOrc(itens: OrcamentoItem[]): number {
  return itens.reduce((sum, it) => sum + it.precoUnitario * it.quantidade, 0)
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default async function MeusOrcamentosPage() {
  let orcamentos: Orcamento[] = []
  try {
    orcamentos = await api.get<Orcamento[]>('/orcamentos/meus')
  } catch {}

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Orçamentos</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Orçamentos enviados pela equipe de manutenção
        </p>
      </div>

      {orcamentos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-border">
          <ReceiptText size={36} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum orçamento disponível ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orcamentos.map((orc) => {
            const cfg = STATUS_CONFIG[orc.status] ?? STATUS_CONFIG.rascunho
            const StatusIcon = cfg.icon
            const total = totalOrc(orc.itens)
            const podeConcluir = orc.status === 'enviado'

            return (
              <div
                key={orc.id}
                className="bg-white border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={[
                      'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                      cfg.class,
                    ].join(' ')}>
                      <StatusIcon size={11} />
                      {cfg.label}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      #{String(orc.numero).padStart(4, '0')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{orc.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Enviado em {fmtData(orc.criadoEm)}
                    {orc.aprovadoEm ? ` · Aprovado em ${fmtData(orc.aprovadoEm)}` : ''}
                    {orc.rejeitadoEm ? ` · Rejeitado em ${fmtData(orc.rejeitadoEm)}` : ''}
                    {' · '}{orc.itens.length} item{orc.itens.length !== 1 ? 'ns' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-base font-bold text-gray-900 tabular-nums">{brl(total)}</p>
                  {podeConcluir && (
                    <Link
                      href={`/o/${orc.tokenPublico}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Aprovar / Rejeitar
                      <ExternalLink size={12} />
                    </Link>
                  )}
                  {!podeConcluir && (
                    <Link
                      href={`/o/${orc.tokenPublico}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-sm text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors"
                    >
                      Ver detalhes
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
