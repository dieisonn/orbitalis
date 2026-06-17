'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { ConcluirOsModal } from './concluir-os-modal'

type Props = { osId: string; osNum: string }

export function ConcluirOsBtn({ osId, osNum }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
      >
        <CheckCircle size={14} />
        Concluir O.S.
      </button>

      {open && (
        <ConcluirOsModal osId={osId} osNum={osNum} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
