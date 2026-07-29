'use client'

import { useState, useTransition } from 'react'
import { atualizarPerfil } from './actions'
import { User, Phone, Wrench, Save, Check, Loader2 } from 'lucide-react'

type Perfil = {
  nome: string | null
  telefone: string | null
  especialidade: string | null
  crea: string | null
  tipo: string
}

export function PerfilForm({ perfil }: { perfil: Perfil }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget
    const nome         = (f.elements.namedItem('nome')         as HTMLInputElement).value
    const telefone     = (f.elements.namedItem('telefone')     as HTMLInputElement).value
    const especialidade = (f.elements.namedItem('especialidade') as HTMLInputElement)?.value ?? ''
    const crea          = (f.elements.namedItem('crea')          as HTMLInputElement)?.value ?? ''

    setError(null)
    startTransition(async () => {
      try {
        await atualizarPerfil(nome, telefone, especialidade, crea)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  const isTecnico = perfil.tipo === 'tecnico'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              name="nome"
              type="text"
              defaultValue={perfil.nome ?? ''}
              placeholder="Seu nome completo"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              name="telefone"
              type="tel"
              defaultValue={perfil.telefone ?? ''}
              placeholder="(11) 99999-9999"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {isTecnico && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Especialidade</label>
            <div className="relative">
              <Wrench size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                name="especialidade"
                type="text"
                defaultValue={perfil.especialidade ?? ''}
                placeholder="Ex: Refrigeração industrial"
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">CREA</label>
            <input
              name="crea"
              type="text"
              defaultValue={perfil.crea ?? ''}
              placeholder="123456/D-SP"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" />Salvando…</>
          ) : saved ? (
            <><Check size={14} className="text-emerald-300" />Salvo!</>
          ) : (
            <><Save size={14} />Salvar alterações</>
          )}
        </button>
      </div>
    </form>
  )
}
