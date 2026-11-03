'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Loader2 } from 'lucide-react'
import { AcessoFields } from '../acesso-fields'
import { criarUsuarioEscritorio, convidarUsuarioEscritorio } from '../actions'

const campo = 'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

export function NovoUsuarioForm() {
  const router = useRouter()
  const [pendente, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function ler(form: HTMLFormElement) {
    const fd = new FormData(form)
    const t = (k: string) => ((fd.get(k) as string) ?? '').trim()
    return {
      nome: t('nome'), email: t('email'), senha: t('senha'), telefone: t('telefone'),
      perfilAcesso: t('perfilAcesso'),
      permissoes: fd.getAll('modulo') as string[],
    }
  }

  function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = ler(e.currentTarget)
    setErro(null)
    start(async () => {
      const r = await criarUsuarioEscritorio(d)
      if (!r.ok) { setErro(r.error); return }
      router.push('/equipe')
      router.refresh()
    })
  }

  function convidar(form: HTMLFormElement) {
    const d = ler(form)
    setErro(null)
    start(async () => {
      const r = await convidarUsuarioEscritorio({ perfilAcesso: d.perfilAcesso, permissoes: d.permissoes, email: d.email })
      if (!r.ok) { setErro(r.error); return }
      setLink(`${window.location.origin}/convite/${r.token}`)
    })
  }

  return (
    <form onSubmit={criar} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-destructive">*</span></label>
        <input name="nome" className={campo} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input name="email" type="email" className={campo} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input name="telefone" className={campo} />
        </div>
      </div>

      <AcessoFields />

      <div className="rounded-xl bg-surface p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha provisória</label>
          <input name="senha" type="text" autoComplete="off" minLength={6} placeholder="Mínimo de 6 caracteres" className={campo} />
          <p className="text-xs text-gray-500 mt-1">Preencha nome, e-mail e senha para criar o acesso agora. Ou use o link de convite: a própria pessoa escolhe e-mail e senha.</p>
        </div>
        {link && (
          <div className="flex items-center gap-2 text-xs bg-white border border-border rounded-lg px-3 py-2">
            <span className="font-mono truncate flex-1" title={link}>{link}</span>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2500) }}
              className="shrink-0 p-1 rounded hover:bg-primary/10 text-primary" aria-label="Copiar link">
              {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>

      {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <a href="/equipe" className="px-5 py-2.5 text-sm text-center border border-border text-gray-600 font-semibold rounded-lg hover:bg-surface transition-colors">Cancelar</a>
        <button type="button" disabled={pendente} onClick={(e) => convidar((e.currentTarget.closest('form') as HTMLFormElement))}
          className="px-5 py-2.5 text-sm font-semibold border border-primary text-primary rounded-lg hover:bg-primary/5 disabled:opacity-60">
          Gerar link de convite
        </button>
        <button type="submit" disabled={pendente}
          className="flex-1 min-w-40 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-60">
          {pendente && <Loader2 size={14} className="animate-spin" />} Criar usuário
        </button>
      </div>
    </form>
  )
}
