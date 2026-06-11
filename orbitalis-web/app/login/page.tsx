'use client'

import { useState, useTransition } from 'react'
import { login } from '@/lib/auth'
import { Mail, Lock, ArrowRight, QrCode, ClipboardList, BarChart3 } from 'lucide-react'

const FEATURES = [
  { icon: QrCode,        text: 'Gestão de ativos com QR Code' },
  { icon: ClipboardList, text: 'Ordens de serviço e checklists PMOC' },
  { icon: BarChart3,     text: 'Relatórios e controle financeiro' },
]

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setError(null)
    startTransition(async () => {
      try {
        await login(email, password)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao fazer login'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — branding (desktop only) ──────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-primary flex-col justify-between p-12">
        {/* Círculos decorativos */}
        <div className="pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border border-white/10" />
          <div className="absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 -left-24  w-72  h-72  rounded-full bg-white/5" />
          <div className="absolute -bottom-24 right-16 w-80  h-80  rounded-full border border-white/10" />
          <div className="absolute -bottom-24 right-16 w-52  h-52  rounded-full bg-white/5" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-2xl p-2.5 shadow-lg">
            <img src="/logo.png" alt="Orbitalis" className="h-10 w-auto object-contain" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">Orbitalis</span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-snug">
              Dados em órbita.<br />Manutenção em dia.
            </h1>
            <p className="text-white/55 mt-3 text-base leading-relaxed">
              Plataforma completa para gestão de ativos,<br />ordens de serviço e planos preventivos PMOC.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white/80" />
                </div>
                <span className="text-white/75 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative z-10 text-white/25 text-xs">
          © {new Date().getFullYear()} Orbitalis · Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito — formulário ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo (mobile) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center bg-primary rounded-3xl p-4 mb-3 shadow-lg">
              <img src="/logo.png" alt="Orbitalis" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-primary font-black text-xl tracking-tight">Orbitalis</p>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Bem-vindo de volta</h2>
            <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password" name="password" type="password" autoComplete="current-password" required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

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
              {isPending ? 'Entrando…' : <><span>Entrar</span><ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-10">
            Acesso restrito a administradores e técnicos autorizados.
          </p>
        </div>
      </div>
    </div>
  )
}
