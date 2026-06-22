'use client'

import { useTransition, useState } from 'react'
import { criarTecnico } from './actions'

export function NovoTecnicoForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const senha = fd.get('senha') as string
    const confirmacao = fd.get('confirmacao') as string
    const nome = fd.get('nome') as string
    const telefone = fd.get('telefone') as string
    const especialidade = fd.get('especialidade') as string
    const crea = fd.get('crea') as string

    if (senha !== confirmacao) { setError('As senhas não coincidem'); return }
    setError(null)
    startTransition(async () => {
      const result = await criarTecnico(email, senha, nome, telefone, especialidade, crea)
      if (result && !result.ok) setError(result.error ?? 'Erro ao criar técnico')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            name="nome"
            placeholder="João da Silva"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            name="telefone"
            type="tel"
            placeholder="(11) 99999-9999"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Especialidade
          </label>
          <input
            name="especialidade"
            placeholder="Ex: Ar-condicionado split, VRF, Chiller…"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CREA / CONFEA
          </label>
          <input
            name="crea"
            placeholder="Ex: 123456/D-SP"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-gray-400 mb-3">Credenciais de acesso ao app mobile</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail <span className="text-destructive">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="tecnico@empresa.com"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha <span className="text-destructive">*</span>
          </label>
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Senha <span className="text-destructive">*</span>
          </label>
          <input
            name="confirmacao"
            type="password"
            required
            minLength={6}
            placeholder="Repita a senha"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a href="/usuarios" className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors">
          Cancelar
        </a>
        <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors">
          {isPending ? 'Criando…' : 'Criar Técnico'}
        </button>
      </div>
    </form>
  )
}
