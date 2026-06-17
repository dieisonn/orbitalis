import { api } from '@/lib/api'
import { FileText, Plus, AlertTriangle } from 'lucide-react'

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
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Descrição</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Vigência</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Valor/mês</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">O.S. inclusas</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {contratos.map((c) => {
                const fim = new Date(c.vigenciaFim).getTime()
                const diasRestantes = Math.ceil((fim - agora) / 86_400_000)
                const vencido = diasRestantes < 0
                const urgente = !vencido && diasRestantes <= 30

                return (
                  <tr key={c.id} className="hover:bg-surface/60">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {c.cliente.nomeFantasia ?? c.cliente.razaoSocial}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{c.descricao}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="text-xs">{fmtDate(c.vigenciaInicio)}</span>
                      <span className="text-gray-300 mx-1">→</span>
                      <span className={`text-xs font-semibold ${vencido ? 'text-red-600' : urgente ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {fmtDate(c.vigenciaFim)}
                      </span>
                      {(vencido || urgente) && (
                        <AlertTriangle size={11} className={`inline ml-1 ${vencido ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{fmtBRL(c.valorMensal)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.numOsIncluidas ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        vencido ? 'bg-red-100 text-red-700' :
                        !c.ativo ? 'bg-gray-100 text-gray-500' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {vencido ? 'Vencido' : !c.ativo ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/contratos/${c.id}`} className="text-primary text-xs font-semibold hover:underline">Ver</a>
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
