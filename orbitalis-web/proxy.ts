import { NextRequest, NextResponse } from 'next/server'

// Rotas públicas que não precisam de token
const PUBLIC = ['/login', '/e/']

// Rotas exclusivas de admin
const ADMIN_ONLY = ['/dashboard', '/clientes', '/ambientes', '/equipamentos', '/ordens-servico', '/planos-manutencao', '/usuarios', '/checklists']
const CLIENT_ONLY = ['/meus-ambientes', '/abrir-chamado', '/historico']
const TECNICO_ONLY = ['/minhas-os']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('orbitalis_token')?.value
  const role  = request.cookies.get('orbitalis_role')?.value
  const { pathname } = request.nextUrl

  // Raiz → redireciona pela role
  if (pathname === '/') {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    if (role === 'cliente') return NextResponse.redirect(new URL('/meus-ambientes', request.url))
    if (role === 'tecnico') return NextResponse.redirect(new URL('/minhas-os', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rota pública sem token → OK
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    if (token && pathname === '/login') {
      if (role === 'cliente') return NextResponse.redirect(new URL('/meus-ambientes', request.url))
      if (role === 'tecnico') return NextResponse.redirect(new URL('/minhas-os', request.url))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Sem token → login
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  // Cliente tentando acessar rotas de admin ou técnico → seu portal
  if (role === 'cliente' && (
    ADMIN_ONLY.some((p) => pathname.startsWith(p)) ||
    TECNICO_ONLY.some((p) => pathname.startsWith(p))
  )) {
    return NextResponse.redirect(new URL('/meus-ambientes', request.url))
  }

  // Técnico tentando acessar rotas de admin ou cliente → suas O.S.
  if (role === 'tecnico' && (
    ADMIN_ONLY.some((p) => pathname.startsWith(p)) ||
    CLIENT_ONLY.some((p) => pathname.startsWith(p))
  )) {
    return NextResponse.redirect(new URL('/minhas-os', request.url))
  }

  // Admin tentando acessar rotas de cliente ou técnico → dashboard
  if (role === 'admin' && (
    CLIENT_ONLY.some((p) => pathname.startsWith(p)) ||
    TECNICO_ONLY.some((p) => pathname.startsWith(p))
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
