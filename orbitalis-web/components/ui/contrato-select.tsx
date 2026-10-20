'use client'

export type ContratoOpcao = { id: string; descricao: string; clienteId: string; vigenciaFim: string; ativo?: boolean }

// Contrato (opcional) que o plano preventivo atende — só lista os contratos do cliente escolhido
export function ContratoSelect({
  contratos,
  clienteId,
  value,
  onChange,
}: {
  contratos: ContratoOpcao[]
  clienteId: string
  value: string
  onChange: (id: string) => void
}) {
  const doCliente = contratos.filter((c) => c.clienteId === clienteId && c.ativo !== false)
  if (!clienteId || doCliente.length === 0) return null

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Contrato atendido</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
      >
        <option value="">Sem contrato vinculado</option>
        {doCliente.map((c) => (
          <option key={c.id} value={c.id}>
            {c.descricao} — até {new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-gray-400 mt-1">
        Vincular permite acompanhar no contrato quantas O.S. já foram geradas e concluídas.
      </p>
    </div>
  )
}
