'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { ClienteSelect } from '@/components/ui/cliente-select'
import { editarContrato } from '../../actions'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Contrato = {
  id: string; clienteId: string; descricao: string; valorMensal: number | string | null; numOsIncluidas: number | null
  vigenciaInicio: string; vigenciaFim: string; observacoes: string | null
}

const campo = 'w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30'

export function EditarContratoForm({ contrato, clientes, temPlanos }: { contrato: Contrato; clientes: Cliente[]; temPlanos: boolean }) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, start] = useTransition()

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setErro(null)
    start(async () => {
      const r = await editarContrato(contrato.id, fd)
      // sucesso redireciona; só volta aqui em caso de erro
      if (r && !r.ok) setErro(r.error)
    })
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
        <ClienteSelect name="clienteId" required defaultValue={contrato.clienteId} clientes={clientes} ariaLabel="Cliente" />
        {temPlanos && <p className="text-xs text-gray-500 mt-1">Este contrato tem planos preventivos do cliente atual; para trocar de cliente, desvincule ou exclua os planos antes.</p>}
      </div>

      <div>
        <label htmlFor="ec-desc" className="block text-xs text-gray-500 mb-1">Nome / descrição do contrato *</label>
        <input id="ec-desc" name="descricao" required maxLength={255} defaultValue={contrato.descricao} className={campo} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ec-ini" className="block text-xs text-gray-500 mb-1">Início da vigência *</label>
          <input id="ec-ini" name="vigenciaInicio" type="date" required defaultValue={contrato.vigenciaInicio.slice(0, 10)} className={campo} />
        </div>
        <div>
          <label htmlFor="ec-fim" className="block text-xs text-gray-500 mb-1">Fim da vigência *</label>
          <input id="ec-fim" name="vigenciaFim" type="date" required defaultValue={contrato.vigenciaFim.slice(0, 10)} className={campo} />
        </div>
        <div>
          <label htmlFor="ec-valor" className="block text-xs text-gray-500 mb-1">Valor mensal (R$)</label>
          <input id="ec-valor" name="valorMensal" type="number" step="0.01" min="0" defaultValue={contrato.valorMensal ?? ''} placeholder="0,00" className={campo} />
        </div>
        <div>
          <label htmlFor="ec-os" className="block text-xs text-gray-500 mb-1">O.S. incluídas por mês</label>
          <input id="ec-os" name="numOsIncluidas" type="number" min="0" defaultValue={contrato.numOsIncluidas ?? ''} placeholder="Sem limite" className={campo} />
        </div>
      </div>

      <div>
        <label htmlFor="ec-obs" className="block text-xs text-gray-500 mb-1">Observações</label>
        <textarea id="ec-obs" name="observacoes" rows={3} defaultValue={contrato.observacoes ?? ''} className={`${campo} resize-none`} />
      </div>

      {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

      <div className="flex gap-3 pt-2">
        <a href={`/contratos/${contrato.id}`} className="flex-1 py-2.5 text-sm text-center border border-border rounded-xl hover:bg-surface transition-colors">Cancelar</a>
        <button type="submit" disabled={pendente}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {pendente && <Loader2 size={14} className="animate-spin" />} Salvar alterações
        </button>
      </div>
    </form>
  )
}
