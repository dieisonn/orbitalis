'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { redefinirSenha } from '@/lib/auth'
import { CartaoAuth, campoSenha, botaoPrimario } from '@/components/ui/cartao-auth'

function Formulario() {
  const token = useSearchParams().get('token') ?? ''
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState(false)

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget.elements
    const nova = (f.namedItem('nova') as HTMLInputElement).value
    const repete = (f.namedItem('repete') as HTMLInputElement).value
    if (nova.length < 8) return setErro('A senha precisa ter ao menos 8 caracteres')
    if (nova !== repete) return setErro('As duas senhas não são iguais')
    setErro(null)
    iniciar(async () => {
      const r = await redefinirSenha(token, nova)
      if ('error' in r) setErro(r.error)
      else setFeito(true)
    })
  }

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-3 rounded-md">Link inválido. Peça um novo em "Esqueci minha senha".</p>
        <Link href="/esqueci-senha" className="block text-center text-sm font-medium text-primary hover:underline">Pedir novo link</Link>
      </div>
    )
  }
  if (feito) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-gray-800 bg-gray-100 px-3 py-3 rounded-md">Senha alterada. Já pode entrar com a nova senha.</p>
        <Link href="/login" className={botaoPrimario}>Ir para o login</Link>
      </div>
    )
  }
  return (
    <form onSubmit={enviar} className="space-y-5">
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
      <button type="submit" disabled={pendente} className={botaoPrimario}>{pendente ? 'Salvando…' : 'Salvar nova senha'}</button>
    </form>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <CartaoAuth titulo="Criar nova senha">
      <Suspense fallback={null}><Formulario /></Suspense>
    </CartaoAuth>
  )
}
