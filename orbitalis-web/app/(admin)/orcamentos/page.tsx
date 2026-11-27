import Link from 'next/link'
import { api } from '@/lib/api'
import { Plus, FileText } from 'lucide-react'
import { ThOrdenavel } from '@/components/ui/th-ordenavel'
import { STATUS_COLOR, STATUS_LABEL as BASE_LABEL } from '@/lib/orcamento'
import { AcoesLinhaOrcamento } from './acoes-linha'
import { lerOrdem, ordenarLista, type Ordem } from '@/lib/ordenacao'

type Orcamento = {
  id: string
  numero: number
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado'
  titulo: string
  criadoEm: string
  validadeDias: number
  total: number
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  _count: { itens: number }
  ordemServico: { id: string; numero: number | null } | null
}

const STATUS_LABEL = { ...BASE_LABEL, enviado: 'Enviado' } as Record<string, string>

const PADRAO_ORDEM: Ordem = { ordem: 'numero', dir: 'desc' }
const CAMPOS = {
  numero: (o: Orcamento) => o.numero,
  titulo: (o: Orcamento) => o.titulo,
  cliente: (o: Orcamento) => o.cliente.nomeFantasia ?? o.cliente.razaoSocial,
  itens: (o: Orcamento) => o._count.itens,
  total: (o: Orcamento) => Number(o.total),
  data: (o: Orcamento) => new Date(o.criadoEm),
  status: (o: Orcamento) => STATUS_LABEL[o.status],
}

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<{ ordem?: string; dir?: string }> }) {
  const ordem = lerOrdem(await searchParams, Object.keys(CAMPOS), PADRAO_ORDEM)
  const orcamentos = ordenarLista(await api.get<Orcamento[]>('/orcamentos').catch(() => [] as Orcamento[]), ordem, CAMPOS)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orcamentos.length} proposta{orcamentos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/orcamentos/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90 transition-colors"
        >
          <Plus size={15} />
          Novo Orçamento
        </Link>
      </div>

      {orcamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={40} className="text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum orçamento criado</p>
          <p className="text-xs text-gray-400 mt-1">Crie o primeiro para enviar ao cliente</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <ThOrdenavel campo="numero" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</ThOrdenavel>
                <ThOrdenavel campo="titulo" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Título / Cliente</ThOrdenavel>
                <ThOrdenavel campo="itens" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Itens</ThOrdenavel>
                <ThOrdenavel campo="total" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</ThOrdenavel>
                <ThOrdenavel campo="data" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Data</ThOrdenavel>
                <ThOrdenavel campo="status" atual={ordem} padrao={PADRAO_ORDEM} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</ThOrdenavel>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orcamentos.map((orc) => (
                <tr key={orc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{String(orc.numero).padStart(4, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/orcamentos/${orc.id}`} className="font-medium text-gray-900 hover:text-primary transition-colors">
                      {orc.titulo}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {orc.cliente.nomeFantasia ?? orc.cliente.razaoSocial}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {orc._count.itens} {orc._count.itens === 1 ? 'item' : 'itens'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {Number(orc.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {new Date(orc.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[orc.status]}`}>
                      {STATUS_LABEL[orc.status]}
                    </span>
                    {orc.ordemServico && (
                      <Link href={`/ordens-servico/${orc.ordemServico.id}`} className="ml-2 text-[11px] text-primary hover:underline">
                        O.S. #{String(orc.ordemServico.numero ?? '').padStart(4, '0')}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AcoesLinhaOrcamento id={orc.id} numero={orc.numero} status={orc.status} temOs={!!orc.ordemServico} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
