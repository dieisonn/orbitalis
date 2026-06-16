'use client'

import { useState, useTransition } from 'react'
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react'
import { deletarPlano } from '@/app/(admin)/planos-manutencao/actions'

export function DeletePlanoButton({ planoId }: { planoId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete(deleteOs: boolean) {
    startTransition(async () => {
      await deletarPlano(planoId, deleteOs)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/20 transition-colors"
        title="Excluir plano"
      >
        <Trash2 size={13} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pending && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => !pending && setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Excluir Plano Preventivo</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Deseja excluir também as <strong>O.S. abertas e agendadas</strong> geradas por este plano?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  O.S. já concluídas ou canceladas <strong>não</strong> serão excluídas em nenhum caso.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={() => handleDelete(true)}
                disabled={pending}
                className="w-full py-2.5 bg-destructive text-white text-sm font-semibold rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Excluir plano e O.S. pendentes
              </button>
              <button
                type="button"
                onClick={() => handleDelete(false)}
                disabled={pending}
                className="w-full py-2.5 border border-destructive/40 text-destructive text-sm font-semibold rounded-lg hover:bg-destructive/5 disabled:opacity-60 transition-colors"
              >
                Excluir apenas o plano
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="w-full py-2.5 border border-border text-gray-600 text-sm rounded-lg hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
