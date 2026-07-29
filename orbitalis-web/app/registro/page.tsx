'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { registrar } from '@/lib/auth'
import { Building2, User, Mail, Lock, ArrowRight, Loader2, QrCode, ClipboardList, BarChart3 } from 'lucide-react'

const FEATURES = [
  { icon: QrCode,        text: 'Gestão de ativos com QR Code' },
  { icon: ClipboardList, text: 'Ordens de serviço e checklists PMOC' },
  { icon: BarChart3,     text: 'Relatórios e controle financeiro' },
]

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export default function RegistroPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  function handleNomeEmpresaChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManual) setSlug(toSlug(e.target.value))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const nomeEmpresa = (form.elements.namedItem('nomeEmpresa') as HTMLInputElement).value
    const slugVal     = (form.elements.namedItem('slug')        as HTMLInputElement).value
    const nomeAdmin   = (form.elements.namedItem('nomeAdmin')   as HTMLInputElement).value
    const email       = (form.elements.namedItem('email')       as HTMLInputElement).value
    const senha       = (form.elements.namedItem('senha')       as HTMLInputElement).value
    const confirmar   = (form.elements.namedItem('confirmar')   as HTMLInputElement).value

    if (senha !== confirmar) {
      setError('As senhas não coincidem')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await registrar(nomeEmpresa, slugVal, nomeAdmin, email, senha)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar conta'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-primary flex-col justify-between p-12">
        <div className="pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border border-white/10" />
          <div className="absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-24 right-16 w-80 h-80 rounded-full border border-white/10" />
        </div>

        <div className="relative z-10">
          <div className="bg-white rounded-3xl p-5 shadow-xl inline-flex">
            <img src="/logo.png" alt="Orbitalis" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-white font-black text-2xl tracking-tight mt-3">Orbitalis</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-snug">
              Comece agora.<br />Sem custo inicial.
            </h1>
            <p className="text-white/55 mt-3 text-base leading-relaxed">
              Crie a conta da sua empresa em segundos<br />e comece a gerenciar ativos hoje mesmo.
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

        <p className="relative z-10 text-white/25 text-xs">
          © {new Date().getFullYear()} Orbitalis · Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito — formulário ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center bg-primary rounded-3xl p-4 mb-3 shadow-lg">
              <img src="/logo.png" alt="Orbitalis" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-primary font-black text-xl tracking-tight">Orbitalis</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Criar conta</h2>
            <p className="text-gray-400 text-sm mt-1">
              Já tem conta?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nome da empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome da empresa
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="nomeEmpresa" type="text" required
                  placeholder="Refrigeração Alfa Ltda"
                  onChange={handleNomeEmpresaChange}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Identificador único (slug)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                  orbitalis.app/
                </span>
                <input
                  name="slug" type="text" required
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                  placeholder="refrigeracao-alfa"
                  className="w-full pl-[88px] pr-4 py-3 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Apenas letras minúsculas, números e hífens</p>
            </div>

            {/* Nome do responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Seu nome
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="nomeAdmin" type="text" required
                  placeholder="João Silva"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="email" type="email" required
                  placeholder="joao@empresa.com"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    name="confirmar" type="password" required minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2"
            >
              {isPending ? (
                <><Loader2 size={15} className="animate-spin" />Criando conta…</>
              ) : (
                <><span>Criar conta gratuita</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
