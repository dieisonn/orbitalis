'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { aceitarConvite } from '@/lib/convites'
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'

type Props = {
  token: string
  tipo: 'tecnico' | 'cliente'
  emailPreenchido: string | null
  nomeEmpresa: string | null
  razaoSocialCliente: string | null
}

export function ConviteForm({ token, tipo, emailPreenchido, nomeEmpresa, razaoSocialCliente }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const tipoLabel = tipo === 'tecnico' ? 'técnico' : 'cliente'
  const destino = tipo === 'tecnico' ? 'Portal do Técnico' : 'Portal do Cliente'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const nome  = (form.elements.namedItem('nome')  as HTMLInputElement).value
    const email = emailPreenchido ?? (form.elements.namedItem('email') as HTMLInputElement).value
    const senha = (form.elements.namedItem('senha')    as HTMLInputElement).value
    const conf  = (form.elements.namedItem('confirmar') as HTMLInputElement).value

    if (senha !== conf) {
      setError('As senhas não coincidem')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await aceitarConvite(token, nome, email, senha)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar conta'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <main id="conteudo" className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8">

        {/* Logo + empresa */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-primary rounded-2xl p-4 mb-4 shadow-lg">
            <img src="/logo.png" alt="Orbitalis" className="h-12 w-auto object-contain" />
          </div>
          {nomeEmpresa && (
            <p className="text-primary font-bold text-sm">{nomeEmpresa}</p>
          )}
          <h1 className="text-xl font-black text-gray-900 mt-1">
            Você foi convidado como {tipoLabel}
          </h1>
          {razaoSocialCliente && (
            <p className="text-sm text-gray-500 mt-0.5">Conta: {razaoSocialCliente}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            Crie seu acesso ao {destino}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu nome</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                name="nome" type="text" required
                placeholder="Nome completo"
                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* E-mail */}
          {emailPreenchido ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={emailPreenchido}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm bg-surface text-gray-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="email" type="email" required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          {/* Senhas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="senha" type="password" required minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="confirmar" type="password" required minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>


          <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="aceite" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-action)]" />
            <span>
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" className="text-action underline">Termos de Uso</Link> e a{' '}
              <Link href="/privacidade" target="_blank" className="text-action underline">Política de Privacidade</Link>.
            </span>
          </label>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? (
              <><Loader2 size={15} className="animate-spin" />Criando conta…</>
            ) : (
              <><span>Criar minha conta</span><ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
