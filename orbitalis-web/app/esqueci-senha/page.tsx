'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { esqueciSenha } from '@/lib/auth'
import { CartaoAuth, campoSenha, botaoPrimario } from '@/components/ui/cartao-auth'

export default function EsqueciSenhaPage() {
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
    setErro(null)
    iniciar(async () => {
      const r = await esqueciSenha(email)
      if ('error' in r) setErro(r.error)
      else setEnviado(true)
    })
  }

  return (
    <CartaoAuth titulo="Esqueci minha senha" subtitulo="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.">
      {enviado ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-gray-800 bg-gray-100 px-3 py-3 rounded-md">
            Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Ele vale por 1 hora; confira também a caixa de spam.
          </p>
          <p className="text-xs text-gray-600">Não recebeu? Peça ao administrador da sua empresa para redefinir a sua senha em Equipe.</p>
          <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="seu@email.com" className={campoSenha} />
          </div>
          {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md">{erro}</p>}
          <button type="submit" disabled={pendente} className={botaoPrimario}>{pendente ? 'Enviando…' : 'Enviar link'}</button>
          <Link href="/login" className="block text-center text-sm text-gray-600 hover:underline">Voltar ao login</Link>
        </form>
      )}
    </CartaoAuth>
  )
}
