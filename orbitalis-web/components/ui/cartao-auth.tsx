import { Logo } from '@/components/ui/logo'

// Moldura simples das telas de senha (esqueci, redefinir, trocar)
export function CartaoAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <main id="conteudo" className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><Logo className="h-12 w-auto inline-block" /></div>
        <h1 className="text-2xl font-semibold text-gray-900">{titulo}</h1>
        {subtitulo && <p className="text-gray-600 text-sm mt-1 mb-6">{subtitulo}</p>}
        {!subtitulo && <div className="mb-6" />}
        {children}
      </div>
    </main>
  )
}

export const campoSenha = 'w-full px-4 py-3 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'
export const botaoPrimario = 'w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-semibold rounded-md text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors'
