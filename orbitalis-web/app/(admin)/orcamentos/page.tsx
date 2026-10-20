import Link from 'next/link'
import { api } from '@/lib/api'
import { Plus, FileText } from 'lucide-react'

type Item = { id: string; descricao: string; precoUnitario: number; quantidade: number }
type Orcamento = {
  id: string
  numero: number
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado'
  titulo: string
  criadoEm: string
  validadeDias: number
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  _count: { itens: number }
  ordemServico: { id: string; numero: number | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  rascunho:  'Rascunho',
  enviado:   'Enviado',
  aprovado:  'Aprovado',
  rejeitado: 'Rejeitado',
  expirado:  'Expirado',
}
const STATUS_COLOR: Record<string, string> = {
  rascunho:  'bg-gray-100 text-gray-600',
  enviado:   'bg-blue-50 text-blue-700',
  aprovado:  'bg-green-50 text-green-700',
  rejeitado: 'bg-red-50 text-red-600',
  expirado:  'bg-yellow-50 text-yellow-700',
}

export default async function OrcamentosPage() {
  const orcamentos = await api.get<Orcamento[]>('/orcamentos').catch(() => [])

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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Título / Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Itens</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
