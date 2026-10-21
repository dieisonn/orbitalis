import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

export function DadosOperador({ className = '' }: { className?: string }) {
  const linhas = [
    LEGAL.razaoSocial && (LEGAL.cnpj ? `${LEGAL.razaoSocial} · CNPJ ${LEGAL.cnpj}` : LEGAL.razaoSocial),
    LEGAL.endereco,
    LEGAL.email && `Contato: ${LEGAL.email}`,
  ].filter(Boolean) as string[]
  if (linhas.length === 0) return null
  return (
    <div className={className}>
      {linhas.map((l) => <p key={l}>{l}</p>)}
    </div>
  )
}

export function LegalShell({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-gray-900">
            <span className="bg-primary rounded-md p-1">
              <img src="/logo.png" alt="" className="h-6 w-auto object-contain" />
            </span>
            Orbitalis
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Voltar
          </Link>
        </div>
      </header>

      <main id="conteudo" className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-semibold text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-600 mt-2">Em vigor desde {LEGAL.vigencia}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-gray-700">{children}</div>
      </main>

      <footer className="border-t border-gray-200 mt-10">
        <div className="max-w-3xl mx-auto px-5 py-8 text-sm text-gray-600 space-y-3">
          <nav aria-label="Documentos legais" className="flex gap-5">
            <Link href="/privacidade" className="hover:text-gray-900 underline-offset-2 hover:underline">Política de Privacidade</Link>
            <Link href="/termos" className="hover:text-gray-900 underline-offset-2 hover:underline">Termos de Uso</Link>
          </nav>
          <DadosOperador />
        </div>
      </footer>
    </div>
  )
}

export const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="text-xl font-semibold text-gray-900 pt-4 scroll-mt-20">{children}</h2>
)
export const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-6 space-y-1.5">{children}</ul>
)
