import type { Metadata } from 'next'
import { PaginaNaoEncontrada } from '@/components/ui/pagina-nao-encontrada'

export const metadata: Metadata = { title: 'Página não encontrada — Orbitalis' }

export default function NotFound() {
  return <PaginaNaoEncontrada inicioHref="/" inicioTexto="Ir para o início" />
}
