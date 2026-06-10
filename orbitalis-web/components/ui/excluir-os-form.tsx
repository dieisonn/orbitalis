'use client'
import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { excluirOs } from '@/app/(admin)/ordens-servico/excluir-os-action'

export function ExcluirOsForm({ osId, osNum }: { osId: string; osNum: string }) {
  const [open, setOpen] = useState(false)
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!senha) return
    setError(null)
    startTransition(async () => {
      const result = await excluirOs(osId, senha)
      if (!result.ok) {
        setError(result.error ?? 'Erro ao excluir')
        return
      }
      // página revalida automaticamente via revalidatePath
    })
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setError(null); setSenha('') }}
        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
        title="Excluir O.S. definitivamente"
      >
        <Trash2 size={11} />
        Excluir
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 p-3 bg-red-50 border border-destructive/20 rounded-lg text-left w-52 space-y-2"
        >
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle size={13} />
            <span className="text-xs font-semibold">Excluir {osNum} definitivamente?</span>
          </div>
          <p className="text-xs text-gray-500">Esta ação é irreversível. Confirme com sua senha de admin.</p>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha do admin"
            required
            className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-destructive/30"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 text-xs border border-border rounded hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !senha}
              className="flex-1 py-1.5 text-xs font-semibold bg-destructive text-white rounded hover:bg-destructive/90 disabled:opacity-60 transition-colors"
            >
              {pending ? '…' : 'Excluir'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
