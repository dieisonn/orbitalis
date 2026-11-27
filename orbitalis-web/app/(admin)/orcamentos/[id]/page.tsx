import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { FileText, ExternalLink, Printer } from 'lucide-react'
import { OrcamentoActions, GerarOsPanel, StatusSelect, AnexosPanel } from './actions'
import { STATUS_COLOR, STATUS_LABEL, fmtData, type OrcamentoCompleto } from '@/lib/orcamento'
import { TIPO_OS_LABEL, type TipoOs } from '@/lib/checklist'

type Orcamento = OrcamentoCompleto

function fmtBRL(v: number | string) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }

export default async function OrcamentoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { aviso } = await searchParams
  let orc: Orcamento
  try { orc = await api.get<Orcamento>(`/orcamentos/${id}`) }
  catch { notFound() }

  // Orçamento aprovado sem O.S. (cliente com vários ambientes): admin escolhe o ambiente
  const ambientesParaGerar =
    orc.status === 'aprovado' && !orc.ordemServico
      ? await api
          .get<{ data: { id: string; nome: string }[] }>(`/ambientes?clienteId=${orc.cliente.id}&perPage=200`)
          .then((r) => r.data)
          .catch(() => [])
      : []

  const t = orc.totais
  const webOrigin = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const linkPublico = `${webOrigin}/o/${orc.tokenPublico}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Topo */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">#{String(orc.numero).padStart(4, '0')}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[orc.status]}`}>
              {STATUS_LABEL[orc.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{orc.titulo}</h1>
          <p className="text-sm text-gray-500">
            {orc.cliente.nomeFantasia ?? orc.cliente.razaoSocial} · Criado em {fmt(orc.criadoEm)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/orcamentos/${orc.id}/pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-gray-900 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Printer size={13} /> PDF
          </Link>
          <OrcamentoActions orc={{ id: orc.id, status: orc.status, tokenPublico: orc.tokenPublico }} />
        </div>
      </div>

      <StatusSelect id={orc.id} status={orc.status} />

      {aviso && <div role="status" className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">{aviso}</div>}

      {/* Link público */}
      {orc.status === 'enviado' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <ExternalLink size={14} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-800">Link de aprovação enviado ao cliente</p>
            <p className="text-xs text-blue-600 truncate mt-0.5">{linkPublico}</p>
          </div>
        </div>
      )}

      {orc.visitaOrigem && (
        <p className="text-sm text-gray-600">
          Originado pela visita{' '}
          <Link href={`/ordens-servico/${orc.visitaOrigem.id}`} className="font-semibold text-primary hover:underline">
            {orc.visitaOrigem.tipoServico?.sigla ?? 'OS'}-{String(orc.visitaOrigem.numero ?? 0).padStart(4, '0')}
          </Link>
          {orc.visitaOrigem.dataConclusao ? ` (${fmt(orc.visitaOrigem.dataConclusao)})` : ''}
        </p>
      )}

      {orc.status === 'aprovado' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 space-y-3">
          <p>✓ Aprovado pelo cliente em {fmt(orc.aprovadoEm)}</p>
          {orc.ordemServico ? (
            <p>
              O.S.{' '}
              <Link href={`/ordens-servico/${orc.ordemServico.id}`} className="font-semibold underline">
                #{String(orc.ordemServico.numero ?? '').padStart(4, '0')}
              </Link>{' '}
              gerada automaticamente — faça a triagem (técnico e data) para agendar.
            </p>
          ) : (
            <div className="space-y-2">
              <p>Nenhuma O.S. foi gerada ainda: escolha o ambiente onde o serviço será executado.</p>
              <GerarOsPanel orcamentoId={orc.id} ambienteId={orc.ambienteId} ambientes={ambientesParaGerar} />
            </div>
          )}
        </div>
      )}

      {orc.status === 'rejeitado' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          ✗ Rejeitado pelo cliente em {fmt(orc.rejeitadoEm)}
        </div>
      )}

      {/* Dados do cliente */}
      <div className="bg-white border border-border rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
          <p className="font-medium text-gray-900">{orc.cliente.razaoSocial}</p>
          {orc.cliente.nomeFantasia && <p className="text-gray-500">{orc.cliente.nomeFantasia}</p>}
          {orc.cliente.documento && <p className="text-xs text-gray-500 mt-0.5">{orc.cliente.documento}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Validade</p>
          <p className="text-gray-900">{orc.validadeDias} dias</p>
          {orc.criadoPor && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 mt-3">Elaborado por</p>
              <p className="text-gray-900">{orc.criadoPor.nome ?? orc.criadoPor.email}</p>
            </>
          )}
        </div>
      </div>

      {/* Execução */}
      <div className="bg-white border border-border rounded-lg p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Manutenção</p>
          <p className="text-gray-900">{TIPO_OS_LABEL[orc.tipoOs] ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Serviço</p>
          <p className="text-gray-900">{orc.tipoServico ? `${orc.tipoServico.sigla} — ${orc.tipoServico.nome}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ambiente</p>
          <p className="text-gray-900">{orc.ambiente?.nome ?? 'Definir na aprovação'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Checklist</p>
          <p className="text-gray-900">{orc.modeloChecklist?.nome ?? 'Automático'}</p>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">Itens da proposta</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Descrição</th>
              <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium hidden sm:table-cell">Qtd</th>
              <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium hidden sm:table-cell">Unit.</th>
              <th className="px-5 py-2 text-right text-xs text-gray-500 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orc.itens.map((item) => {
              const sub = Number(item.quantidade) * Number(item.precoUnitario)
              return (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-gray-900">
                    {item.descricao}
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                      {item.categoria === 'peca' ? 'Peça' : 'Serviço'}
                    </span>
                    <span className="text-xs text-gray-500 ml-1 sm:hidden">
                      × {item.quantidade} {item.unidade}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {item.quantidade} {item.unidade}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {fmtBRL(item.precoUnitario)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{fmtBRL(sub)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {(t.descontoValor > 0 || t.frete > 0) && (
              <tr className="border-t-2 border-border">
                <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">Subtotal</td>
                <td className="px-5 py-2 text-right text-sm text-gray-700">{fmtBRL(t.subtotal)}</td>
              </tr>
            )}
            {t.descontoValor > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-1 text-right text-sm text-gray-500">Desconto{orc.descontoTipo === 'percentual' ? ` (${Number(orc.desconto)}%)` : ''}</td>
                <td className="px-5 py-1 text-right text-sm text-red-600">− {fmtBRL(t.descontoValor)}</td>
              </tr>
            )}
            {t.frete > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-1 text-right text-sm text-gray-500">Frete / despesas</td>
                <td className="px-5 py-1 text-right text-sm text-gray-700">{fmtBRL(t.frete)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-border bg-muted/20">
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-gray-900">Total</td>
              <td className="px-5 py-3 text-right text-lg font-bold text-gray-900">{fmtBRL(t.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(orc.formaPagamento || orc.parcelas.length > 0) && (
        <div className="bg-white border border-border rounded-lg p-5 text-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagamento</p>
          {orc.formaPagamento && <p className="text-gray-900">{orc.formaPagamento}</p>}
          {orc.parcelas.length > 0 && (
            <ul className="divide-y divide-border">
              {orc.parcelas.map((pc) => (
                <li key={pc.id} className="flex justify-between py-1.5"><span className="text-gray-600">{pc.numero}ª · vence {fmtData(pc.vencimento)}</span><span className="font-medium text-gray-900">{fmtBRL(Number(pc.valor))}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      {orc.observacoes && (
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observações</p>
          <p className="text-sm text-gray-900 whitespace-pre-line">{orc.observacoes}</p>
        </div>
      )}

      {orc.observacoesInternas && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Observações internas (não aparecem para o cliente)</p>
          <p className="text-sm text-amber-950 whitespace-pre-line">{orc.observacoesInternas}</p>
        </div>
      )}

      <AnexosPanel orcamentoId={orc.id} anexos={orc.anexos} />
    </div>
  )
}
