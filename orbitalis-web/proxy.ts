import { NextRequest, NextResponse } from 'next/server'

// Rotas públicas que não precisam de token
const PUBLIC = ['/login']

// Rotas exclusivas de cada role
const ADMIN_ONLY = ['/dashboard', '/clientes', '/ambientes', '/equipamentos', '/ordens-servico', '/planos-manutencao', '/usuarios', '/checklists']
const CLIENT_ONLY = ['/meus-ambientes', '/abrir-chamado', '/historico']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('orbitalis_token')?.value
  const role  = request.cookies.get('orbitalis_role')?.value
  const { pathname } = request.nextUrl

  // Raiz → redireciona pela role
  if (pathname === '/') {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.redirect(
      new URL(role === 'cliente' ? '/meus-ambientes' : '/dashboard', request.url),
    )
  }

  // Rota pública sem token → OK
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    if (token) {
      return NextResponse.redirect(
        new URL(role === 'cliente' ? '/meus-ambientes' : '/dashboard', request.url),
      )
    }
    return NextResponse.next()
  }

  // Sem token → login
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  // Cliente tentando acessar rotas de admin → redireciona para seu portal
  if (role === 'cliente' && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/meus-ambientes', request.url))
  }

  // Admin tentando acessar rotas de cliente → redireciona para admin
  if (role === 'admin' && CLIENT_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
