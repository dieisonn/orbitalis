'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Check, Loader2 } from 'lucide-react'
import { definirAuxiliares } from '../actions'

type Tec = { id: string; email: string; nome: string | null }

/** Técnicos auxiliares: veem a O.S. no portal deles e podem preencher junto com o responsável. */
export function AuxiliaresOs({ osId, responsavelId, tecnicos, atuais, editavel }: {
  osId: string
  responsavelId: string | null
  tecnicos: Tec[]
  atuais: string[]
  editavel: boolean
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set(atuais))
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const nome = (t: Tec) => t.nome ?? t.email
  const candidatos = tecnicos.filter((t) => t.id !== responsavelId)
  const lista = tecnicos.filter((t) => atuais.includes(t.id))

  function salvar() {
    setErro(null)
    startTransition(async () => {
      const r = await definirAuxiliares(osId, [...sel])
      if (!r.ok) { setErro(r.error); return }
      setEditando(false)
      router.refresh()
    })
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 flex items-center gap-1"><Users size={10} /> Técnicos auxiliares</p>
        {editavel && !editando && (
          <button type="button" onClick={() => setEditando(true)} className="text-xs font-semibold text-primary">{lista.length ? 'Alterar' : 'Adicionar'}</button>
        )}
      </div>
      {!editando ? (
        <p className="text-sm text-gray-800 mt-1">
          {lista.length ? lista.map(nome).join(', ') : <span className="italic text-gray-400">Nenhum. O responsável faz a O.S. sozinho.</span>}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {!responsavelId && <p className="text-xs text-amber-700">Defina primeiro o técnico responsável.</p>}
          <div className="flex flex-wrap gap-2">
            {candidatos.map((t) => {
              const on = sel.has(t.id)
              return (
                <button key={t.id} type="button" disabled={!responsavelId}
                  onClick={() => setSel((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })}
                  className={['inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border disabled:opacity-50', on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border'].join(' ')}>
                  {on && <Check size={13} />} {nome(t)}
                </button>
              )
            })}
            {candidatos.length === 0 && <p className="text-xs text-gray-400">Não há outros técnicos cadastrados.</p>}
          </div>
          <p className="text-xs text-gray-400">Os auxiliares recebem um aviso e passam a ver e preencher esta O.S. no portal do técnico.</p>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={salvar} disabled={pendente || !responsavelId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60">
              {pendente && <Loader2 size={13} className="animate-spin" />} Salvar
            </button>
            <button type="button" onClick={() => { setEditando(false); setSel(new Set(atuais)) }} className="px-3 py-1.5 rounded-lg border border-border text-sm text-gray-600">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
