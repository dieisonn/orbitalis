'use client'

import { dataDaVisita, fmtDataISO } from '@/lib/plano'

// Campo obrigatório: quantas limpezas/inspeções por equipamento o plano inclui.
// A geração de O.S. para ao atingir esse número, mesmo que a data limite seja maior.
export function CampoVisitas({
  valor,
  onChange,
  primeira,
  frequenciaDias,
  dataLimite,
  geradas,
}: {
  valor: string
  onChange: (v: string) => void
  primeira: string
  frequenciaDias: number
  dataLimite?: string
  geradas?: number
}) {
  const n = Number(valor)
  const valido = Number.isInteger(n) && n >= 1 && n <= 120
  const restantes = n - (geradas ?? 0)
  const ultima = valido && restantes >= 1 ? dataDaVisita(primeira, frequenciaDias, restantes - 1) : null
  const passaDoLimite = !!(ultima && dataLimite && ultima > dataLimite)
  return (
    <div>
      <label htmlFor="visitasPrevistas" className="block text-sm font-medium text-gray-700 mb-1">
        Visitas por equipamento no plano <span className="text-destructive">*</span>
      </label>
      <input
        id="visitasPrevistas"
        name="visitasPrevistas"
        type="number"
        required
        min={1}
        max={120}
        step={1}
        inputMode="numeric"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="visitas-ajuda"
        placeholder="Ex: 2"
        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <p id="visitas-ajuda" className={`text-xs mt-1 ${passaDoLimite ? 'text-red-700' : 'text-gray-500'}`}>
        {ultima
          ? passaDoLimite
            ? `A última visita (${fmtDataISO(ultima)}) passa da data limite; as O.S. param na data limite.`
            : `Limpezas/inspeções incluídas por equipamento. Última visita prevista: ${fmtDataISO(ultima)}.`
          : 'Quantas limpezas/inspeções cada equipamento recebe neste plano (ex.: 2 por ano).'}
        {geradas != null && geradas > 0 ? ` ${geradas} já gerada(s).` : ''}
      </p>
    </div>
  )
}
