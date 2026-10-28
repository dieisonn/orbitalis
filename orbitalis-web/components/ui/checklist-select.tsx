'use client'

import { sugerirModelo, TIPO_OS_LABEL, type ModeloResumo, type TipoOs } from '@/lib/checklist'

type Props = {
  modelos: ModeloResumo[]
  tipo: TipoOs | null
  tipoServicoId: string | null
  value: string
  onChange: (id: string) => void
  className?: string
  /** Mostra a opção "Sem checklist" (valor NENHUM_CHECKLIST) para quem programa decidir que não terá. */
  permitirNenhum?: boolean
}

export const NENHUM_CHECKLIST = 'none'

/** Seletor de checklist: "Automático" (sugestão por tipo + serviço) ou um modelo específico. */
export function ChecklistSelect({ modelos, tipo, tipoServicoId, value, onChange, className, permitirNenhum = false }: Props) {
  const sugerido = sugerirModelo(modelos, tipo, tipoServicoId)

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white'
        }
      >
        <option value="">
          {sugerido ? `Automático — ${sugerido.nome}` : 'Automático — nenhum checklist para este caso'}
        </option>
        {permitirNenhum && <option value={NENHUM_CHECKLIST}>Sem checklist nesta O.S.</option>}
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {m.tipo ? ` (${TIPO_OS_LABEL[m.tipo]})` : ''}
          </option>
        ))}
      </select>
      {!value && !sugerido && value !== NENHUM_CHECKLIST && (
        <p className="text-xs text-amber-600 mt-1">
          Não há checklist cadastrado para este tipo/serviço. A O.S. será criada sem checklist —{' '}
          <a href="/checklists/novo" className="underline">crie um em Checklists</a>.
        </p>
      )}
    </div>
  )
}
