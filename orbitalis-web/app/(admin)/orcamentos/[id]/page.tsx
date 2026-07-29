import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { FileText, ExternalLink, Printer } from 'lucide-react'
import { OrcamentoActions } from './actions'

type OrcItem = { id: string; descricao: string; quantidade: number; unidade: string; precoUnitario: number }
type Orcamento = {
  id: string; numero: number; status: string; titulo: string
  validadeDias: number; observacoes: string | null; tokenPublico: string
  criadoEm: string; aprovadoEm: string | null; rejeitadoEm: string | null
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string }
  criadoPor: { nome: string | null; email: string } | null
  itens: OrcItem[]
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Aguardando aprovação', aprovado: 'Aprovado', rejeitado: 'Rejeitado', expirado: 'Expirado',
}
const STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600', enviado: 'bg-blue-50 text-blue-700',
  aprovado: 'bg-green-50 text-green-700', rejeitado: 'bg-red-50 text-red-600', expirado: 'bg-yellow-50 text-yellow-700',
}

function fmtBRL(v: number) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

type Props = { params: Promise<{ id: string }> }

export default async function OrcamentoPage({ params }: Props) {
  const { id } = await params
  let orc: Orcamento
  try { orc = await api.get<Orcamento>(`/orcamentos/${id}`) }
  catch { notFound() }

  const total = orc.itens.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.precoUnitario), 0)
  const webOrigin = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const linkPublico = `${webOrigin}/o/${orc.tokenPublico}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Topo */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{String(orc.numero).padStart(4, '0')}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[orc.status]}`}>
              {STATUS_LABEL[orc.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">{orc.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {orc.cliente.nomeFantasia ?? orc.cliente.razaoSocial} · Criado em {fmt(orc.criadoEm)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/orcamentos/${orc.id}/pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Printer size={13} /> PDF
          </Link>
          <OrcamentoActions orc={{ id: orc.id, status: orc.status, tokenPublico: orc.tokenPublico }} />
        </div>
      </div>

      {/* Link público */}
      {orc.status === 'enviado' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <ExternalLink size={14} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-800">Link de aprovação enviado ao cliente</p>
            <p className="text-xs text-blue-600 truncate mt-0.5">{linkPublico}</p>
          </div>
          <button
            onClick={() => {}}
            className="text-xs text-blue-700 font-medium hover:text-blue-900 shrink-0"
          >
            Copiar
          </button>
        </div>
      )}

      {orc.status === 'aprovado' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          ✓ Aprovado pelo cliente em {fmt(orc.aprovadoEm)}
        </div>
      )}

      {orc.status === 'rejeitado' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ✗ Rejeitado pelo cliente em {fmt(orc.rejeitadoEm)}
        </div>
      )}

      {/* Dados do cliente */}
      <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
          <p className="font-medium text-foreground">{orc.cliente.razaoSocial}</p>
          {orc.cliente.nomeFantasia && <p className="text-muted-foreground">{orc.cliente.nomeFantasia}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{orc.cliente.documento}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Validade</p>
          <p className="text-foreground">{orc.validadeDias} dias</p>
          {orc.criadoPor && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-3">Elaborado por</p>
              <p className="text-foreground">{orc.criadoPor.nome ?? orc.criadoPor.email}</p>
            </>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Itens da proposta</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-2 text-left text-xs text-muted-foreground font-medium">Descrição</th>
              <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium hidden sm:table-cell">Qtd</th>
              <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium hidden sm:table-cell">Unit.</th>
              <th className="px-5 py-2 text-right text-xs text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orc.itens.map((item) => {
              const sub = Number(item.quantidade) * Number(item.precoUnitario)
              return (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-foreground">
                    {item.descricao}
                    <span className="text-xs text-muted-foreground ml-1 sm:hidden">
                      × {item.quantidade} {item.unidade}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">
                    {item.quantidade} {item.unidade}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">
                    {fmtBRL(item.precoUnitario)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">{fmtBRL(sub)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-foreground">Total</td>
              <td className="px-5 py-3 text-right text-lg font-bold text-foreground">{fmtBRL(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observações */}
      {orc.observacoes && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observações</p>
          <p className="text-sm text-foreground whitespace-pre-line">{orc.observacoes}</p>
        </div>
      )}
    </div>
  )
}
