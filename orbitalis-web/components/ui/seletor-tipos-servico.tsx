'use client'

import { textoSobre } from '@/lib/cor'

export type TipoServicoOpcao = { id: string; sigla: string; nome: string; corHex: string }

/**
 * Escolha de um ou mais tipos de serviço. O primeiro marcado é o principal (define a cor, a sigla
 * do número e o checklist sugerido); os demais aparecem junto na O.S.
 */
export function SeletorTiposServico({
  tipos, value, onChange,
}: { tipos: TipoServicoOpcao[]; value: string[]; onChange: (ids: string[]) => void }) {
  function alternar(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tipos.map((ts) => {
          const sel = value.includes(ts.id)
          const principal = value[0] === ts.id && value.length > 1
          return (
            <button key={ts.id} type="button" onClick={() => alternar(ts.id)} aria-pressed={sel}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all text-left ${sel ? 'border-transparent shadow-sm' : 'border-border text-gray-600 hover:bg-surface'}`}
              style={sel ? { backgroundColor: ts.corHex, color: textoSobre(ts.corHex) } : {}}>
              <span className="shrink-0 text-xs font-bold w-7 text-center py-0.5 rounded"
                style={{ backgroundColor: sel ? 'transparent' : ts.corHex, color: sel ? 'inherit' : textoSobre(ts.corHex), boxShadow: sel ? 'inset 0 0 0 1px currentColor' : undefined }}>
                {ts.sigla}
              </span>
              <span className="text-xs leading-tight flex-1">{ts.nome}</span>
              {principal && <span className="text-[10px] uppercase tracking-wide opacity-80">principal</span>}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        Você pode marcar mais de um tipo. O primeiro marcado é o principal (cor, número e checklist sugerido).
      </p>
    </div>
  )
}
