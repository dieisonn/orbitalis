'use client'

import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

type Props = {
  /** Dentro do painel/portal (já tem menu): sem logo e sem altura de tela cheia. */
  compacto?: boolean
  inicioHref: string
  inicioTexto: string
}

/** Página 404 do Orbitalis — mesma identidade das telas de login: logo, texto direto e dois caminhos de volta. */
export function PaginaNaoEncontrada({ compacto = false, inicioHref, inicioTexto }: Props) {
  const Raiz = compacto ? 'div' : 'main'
  return (
    <Raiz
      {...(compacto ? {} : { id: 'conteudo' })}
      className={`flex flex-col items-center justify-center text-center px-5 ${compacto ? 'py-24' : 'min-h-dvh bg-surface py-16'}`}
    >
      {!compacto && <Logo className="h-9 w-auto mb-12" />}
      <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5" aria-hidden>
        <Compass size={28} />
      </div>
      <p className="text-sm font-semibold text-gray-500 tabular-nums">Erro 404</p>
      <h1 className="text-2xl font-bold text-gray-900 mt-1">Página não encontrada</h1>
      <p className="text-sm text-gray-600 mt-2 max-w-sm">
        O endereço pode ter sido digitado errado, ou a página foi movida ou removida.
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5 mt-7 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = inicioHref))}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-border bg-white text-gray-800 text-sm font-semibold rounded-md hover:bg-surface"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
        <Link href={inicioHref} className="inline-flex items-center justify-center px-5 py-3 bg-primary text-white text-sm font-bold rounded-md hover:bg-primary/90">
          {inicioTexto}
        </Link>
      </div>
    </Raiz>
  )
}
