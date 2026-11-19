'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { trocarSenha } from '@/lib/auth'
import { CartaoAuth, campoSenha, botaoPrimario } from '@/components/ui/cartao-auth'

function destinoPorPerfil(): string {
  const role = document.cookie.split('; ').find((c) => c.startsWith('orbitalis_role='))?.split('=')[1]
  return role === 'cliente' ? '/meu-painel' : role === 'tecnico' ? '/minhas-os' : '/dashboard'
}

function Formulario() {
  const obrigatoria = useSearchParams().get('obrigatoria') === '1'
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState(false)

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget.elements
    const atual = (f.namedItem('atual') as HTMLInputElement).value
    const nova = (f.namedItem('nova') as HTMLInputElement).value
    const repete = (f.namedItem('repete') as HTMLInputElement).value
    if (nova.length < 8) return setErro('A nova senha precisa ter ao menos 8 caracteres')
    if (nova !== repete) return setErro('As duas senhas novas não são iguais')
    setErro(null)
    iniciar(async () => {
      const r = await trocarSenha(atual, nova)
      if ('error' in r) { setErro(r.error); return }
      setFeito(true)
      setTimeout(() => { window.location.href = destinoPorPerfil() }, 1200)
    })
  }

  if (feito) return <p role="status" className="text-sm text-gray-800 bg-gray-100 px-3 py-3 rounded-md">Senha alterada. Levando você ao sistema…</p>
  return (
    <form onSubmit={enviar} className="space-y-5">
      {obrigatoria && (
        <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2.5 rounded-md">
          Sua senha foi redefinida por um administrador. Crie agora a sua senha para continuar. Na primeira caixa, digite a senha temporária que recebeu.
        </p>
      )}
      <div>
        <label htmlFor="atual" className="block text-sm font-medium text-gray-700 mb-1.5">{obrigatoria ? 'Senha temporária' : 'Senha atual'}</label>
        <input id="atual" name="atual" type="password" autoComplete="current-password" required className={campoSenha} />
      </div>
      <div>
        <label htmlFor="nova" className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
        <input id="nova" name="nova" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={campoSenha} />
        <p className="text-xs text-gray-600 mt-1">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <label htmlFor="repete" className="block text-sm font-medium text-gray-700 mb-1.5">Repita a nova senha</label>
        <input id="repete" name="repete" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={campoSenha} />
      </div>
      {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md">{erro}</p>}
      <button type="submit" disabled={pendente} className={botaoPrimario}>{pendente ? 'Salvando…' : 'Trocar senha'}</button>
    </form>
  )
}

export default function TrocarSenhaPage() {
  return (
    <CartaoAuth titulo="Trocar senha">
      <Suspense fallback={null}><Formulario /></Suspense>
    </CartaoAuth>
  )
}
