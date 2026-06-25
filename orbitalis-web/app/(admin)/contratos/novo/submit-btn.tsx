'use client'
import { useFormStatus } from 'react-dom'

export function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 py-2.5 text-sm font-semibold bg-action text-white rounded-xl hover:bg-action/90 transition-colors disabled:opacity-60"
    >
      {pending ? 'Criando…' : 'Criar Contrato'}
    </button>
  )
}
