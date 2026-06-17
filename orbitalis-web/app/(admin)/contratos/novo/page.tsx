import { api } from '@/lib/api'
import { criarContrato } from '../actions'
import { FileText } from 'lucide-react'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Props = { searchParams: Promise<{ clienteId?: string }> }

export default async function NovoContratoPage({ searchParams }: Props) {
  const { clienteId: preCliente } = await searchParams
  const hoje = new Date().toISOString().split('T')[0]
  const em1ano = new Date(Date.now() + 365 * 86_400_000).toISOString().split('T')[0]

  const clientesRes = await api.get<{ data: Cliente[] }>('/clientes?perPage=500').catch(() => ({ data: [] as Cliente[] }))
  const clientes = clientesRes.data

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/contratos" className="text-gray-500 hover:text-primary transition-colors">← Contratos</a>
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={18} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Novo Contrato</h1>
        </div>

        <form action={criarContrato} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
            <select name="clienteId" required defaultValue={preCliente ?? ''}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              <option value="">Selecione um cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nomeFantasia ?? c.razaoSocial}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Descrição do contrato *</label>
            <input name="descricao" required placeholder="ex: Contrato de Manutenção Preventiva 2025"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início da vigência *</label>
              <input name="vigenciaInicio" type="date" required defaultValue={hoje}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fim da vigência *</label>
              <input name="vigenciaFim" type="date" required defaultValue={em1ano}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor mensal (R$)</label>
              <input name="valorMensal" type="number" step="0.01" min="0" placeholder="0,00"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">O.S. inclusas/mês</label>
              <input name="numOsIncluidas" type="number" min="0" placeholder="—"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Observações</label>
            <textarea name="observacoes" rows={3} placeholder="Escopo, cláusulas especiais, etc."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <a href="/contratos"
              className="flex-1 py-2.5 text-sm text-center border border-border rounded-xl hover:bg-surface transition-colors">
              Cancelar
            </a>
            <button type="submit"
              className="flex-1 py-2.5 text-sm font-semibold bg-action text-white rounded-xl hover:bg-action/90 transition-colors">
              Criar Contrato
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
