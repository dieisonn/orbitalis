'use client'

import { Check, Users } from 'lucide-react'

type Tec = { id: string; email: string; nome: string | null }

/** Escolha dos técnicos ajudantes (auxiliares) da O.S.: veem a O.S. no portal e preenchem junto com o responsável. */
export function AjudantesSelect({ tecnicos, responsavelId, value, onChange }: {
  tecnicos: Tec[]
  responsavelId: string
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const candidatos = tecnicos.filter((t) => t.id !== responsavelId)
  const marcados = value.filter((id) => id !== responsavelId)
  const alternar = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <Users size={13} className="inline -mt-0.5 mr-1 text-gray-400" />
        Técnicos ajudantes <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
      </label>
      {!responsavelId ? (
        <p className="text-xs text-gray-400">Escolha primeiro o técnico responsável para poder adicionar ajudantes.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {candidatos.map((t) => {
              const on = marcados.includes(t.id)
              return (
                <button key={t.id} type="button" onClick={() => alternar(t.id)} aria-pressed={on}
                  className={['inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border', on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border'].join(' ')}>
                  {on && <Check size={13} />} {t.nome ?? t.email}
                </button>
              )
            })}
            {candidatos.length === 0 && <p className="text-xs text-gray-400">Não há outros técnicos cadastrados.</p>}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Os ajudantes recebem um aviso e passam a ver e preencher esta O.S. no portal do técnico.</p>
        </>
      )}
    </div>
  )
}
