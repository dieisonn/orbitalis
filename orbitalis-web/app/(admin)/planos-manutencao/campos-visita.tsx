'use client'

/**
 * Como a visita é organizada: agrupamento das O.S. (uma por cliente ou por ambiente), limite de
 * equipamentos por O.S. e horário padrão. Campos não controlados: o formulário lê via FormData.
 */
export function CamposVisita({
  agrupamento, maxEquipamentosPorOs, horaInicio, horaFim,
}: {
  agrupamento?: string | null
  maxEquipamentosPorOs?: number | null
  horaInicio?: string | null
  horaFim?: string | null
}) {
  const cls = 'w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
      <div>
        <label htmlFor="agrupamento" className="block text-sm font-medium text-gray-700 mb-1">Como agrupar as O.S. de cada visita</label>
        <select id="agrupamento" name="agrupamento" defaultValue={agrupamento ?? ''} className={cls}>
          <option value="">Padrão da empresa (Configurações)</option>
          <option value="cliente">Uma O.S. por visita — todos os equipamentos do cliente juntos</option>
          <option value="ambiente">Uma O.S. por ambiente</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Por visita, a agenda recebe um único evento e o técnico preenche um documento só (cada equipamento mantém o seu checklist).</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="maxEquipamentosPorOs" className="block text-sm font-medium text-gray-700 mb-1">Máx. equipamentos por O.S.</label>
          <input id="maxEquipamentosPorOs" name="maxEquipamentosPorOs" type="number" min={1} max={500} defaultValue={maxEquipamentosPorOs ?? ''} placeholder="Sem limite" className={cls} />
        </div>
        <div>
          <label htmlFor="horaInicio" className="block text-sm font-medium text-gray-700 mb-1">Chegada (opcional)</label>
          <input id="horaInicio" name="horaInicio" type="time" defaultValue={horaInicio ?? ''} className={cls} />
        </div>
        <div>
          <label htmlFor="horaFim" className="block text-sm font-medium text-gray-700 mb-1">Saída (opcional)</label>
          <input id="horaFim" name="horaFim" type="time" defaultValue={horaFim ?? ''} className={cls} />
        </div>
      </div>
    </div>
  )
}
