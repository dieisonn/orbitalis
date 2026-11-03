'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AcessoFields } from '../../acesso-fields'
import { atualizarAcessoUsuario } from '../../actions'

export function EditarAcessoForm({ userId, perfil, modulos }: { userId: string; perfil: string; modulos: string[] }) {
  const router = useRouter()
  const [pendente, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setErro(null)
    start(async () => {
      const r = await atualizarAcessoUsuario(userId, { perfilAcesso: fd.get('perfilAcesso') as string, permissoes: fd.getAll('modulo') as string[] })
      if (!r.ok) { setErro(r.error); return }
      router.push('/equipe')
      router.refresh()
    })
  }

  return (
    <form onSubmit={salvar} className="space-y-5">
      <AcessoFields perfilInicial={perfil} modulosIniciais={modulos} />
      {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
      <div className="flex gap-3">
        <a href="/equipe" className="px-5 py-2.5 text-sm text-center border border-border text-gray-600 font-semibold rounded-lg hover:bg-surface transition-colors">Cancelar</a>
        <button type="submit" disabled={pendente}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-60">
          {pendente && <Loader2 size={14} className="animate-spin" />} Salvar acesso
        </button>
      </div>
    </form>
  )
}
