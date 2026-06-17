'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, PowerOff, Trash2 } from 'lucide-react'
import { atualizarContrato, excluirContrato } from '../actions'

export function ContratoActions({ contratoId, ativo }: { contratoId: string; ativo: boolean }) {
  const [open, setOpen]     = useState(false)
  const [pending, start]    = useTransition()
  const router = useRouter()

  function toggleAtivo() {
    start(async () => {
      await atualizarContrato(contratoId, { ativo: !ativo })
      setOpen(false)
      router.refresh()
    })
  }

  function handleExcluir() {
    if (!confirm('Excluir este contrato? Ação irreversível.')) return
    start(async () => {
      await excluirContrato(contratoId)
      router.push('/contratos')
    })
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} disabled={pending}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-gray-400 hover:text-gray-600 transition-colors">
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white border border-border rounded-xl shadow-xl w-48 overflow-hidden py-1">
            <button onClick={toggleAtivo} disabled={pending}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface transition-colors">
              <PowerOff size={14} className="text-gray-400" />
              {ativo ? 'Desativar contrato' : 'Reativar contrato'}
            </button>
            <div className="h-px bg-border mx-3 my-1" />
            <button onClick={handleExcluir} disabled={pending}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}
