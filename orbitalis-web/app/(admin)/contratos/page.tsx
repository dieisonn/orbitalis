import { api } from '@/lib/api'
import { FileText, Plus, AlertTriangle } from 'lucide-react'
import { DeleteButton } from '@/components/ui/delete-button'
import { excluirContrato } from './actions'

type Contrato = {
  id: string; descricao: string; valorMensal: number | null
  vigenciaInicio: string; vigenciaFim: string; numOsIncluidas: number | null
  ativo: boolean
  cliente: { razaoSocial: string; nomeFantasia: string | null }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}
function fmtBRL(v: number | null) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ContratosPage() {
  const contratos = await api.get<Contrato[]>('/contratos').catch(() => [] as Contrato[])
  const agora = Date.now()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contratos</h1>
          <p className="text-gray-500 text-sm mt-1">{contratos.length} contrato(s) cadastrado(s)</p>
        </div>
        <a href="/contratos/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          <Plus size={14} /> Novo Contrato
        </a>
      </div>

      {contratos.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-border">
          <FileText size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400">Nenhum contrato cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Descrição</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Vigência</th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Valor Total</th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase" title="Ordens de Serviço incluídas mensalmente no contrato">O.S./mês</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {contratos.map((c) => {
                const fim = new Date(c.vigenciaFim).getTime()
                const diasRestantes = Math.ceil((fim - agora) / 86_400_000)
                const vencido = diasRestantes < 0
                const urgente = !vencido && diasRestantes <= 30

                const meses = Math.max(1, Math.round((fim - new Date(c.vigenciaInicio).getTime()) / (30 * 86_400_000)))
                const valorTotal = c.valorMensal != null ? c.valorMensal * meses : null

                return (
                  <tr key={c.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3 font-medium text-gray-800 overflow-hidden">
                      <div className="truncate">{c.cliente.nomeFantasia ?? c.cliente.razaoSocial}</div>
                      <div className="sm:hidden mt-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          vencido ? 'bg-red-100 text-red-700' :
                          !c.ativo ? 'bg-gray-100 text-gray-500' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {vencido ? 'Vencido' : !c.ativo ? 'Inativo' : 'Ativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs overflow-hidden">
                      <div className="truncate">{c.descricao}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-500 whitespace-nowrap">
                      <span className="text-xs">{fmtDate(c.vigenciaInicio)}</span>
                      <span className="text-gray-300 mx-1">→</span>
                      <span className={`text-xs font-semibold ${vencido ? 'text-red-600' : urgente ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {fmtDate(c.vigenciaFim)}
                      </span>
                      {(vencido || urgente) && (
                        <AlertTriangle size={11} className={`inline ml-1 ${vencido ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-700 font-mono text-xs">
                      {fmtBRL(valorTotal)}
                      {c.valorMensal != null && (
                        <div className="text-[10px] text-gray-400">{fmtBRL(c.valorMensal)}/mês × {meses}</div>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-500 text-xs">{c.numOsIncluidas ?? '—'}</td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        vencido ? 'bg-red-100 text-red-700' :
                        !c.ativo ? 'bg-gray-100 text-gray-500' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {vencido ? 'Vencido' : !c.ativo ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/contratos/${c.id}`} className="text-primary text-xs font-semibold hover:underline">Ver</a>
                        <DeleteButton action={excluirContrato.bind(null, c.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
