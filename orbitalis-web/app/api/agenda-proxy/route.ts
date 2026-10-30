import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

// Proxy autenticado (cookie → Bearer) restrito às rotas /agenda e /feriados da API
async function proxy(request: NextRequest, method: string) {
  const token = (await cookies()).get('orbitalis_token')?.value
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const path = request.nextUrl.searchParams.get('path') ?? '/agenda'
  if (!/^\/(agenda(\/avisos|\/serie|\/[0-9a-f-]{36}(\/restaurar)?)?|feriados(\/[0-9a-f-]{36})?)(\?.*)?$/i.test(path)) {
    return NextResponse.json({ message: 'Rota inválida' }, { status: 400 })
  }

  const hasBody = ['POST', 'PATCH', 'PUT'].includes(method)
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  })

  const ct = res.headers.get('content-type') ?? ''
  const data = ct.includes('application/json') ? await res.json() : null
  return NextResponse.json(data, { status: res.status })
}

export const GET    = (req: NextRequest) => proxy(req, 'GET')
export const POST   = (req: NextRequest) => proxy(req, 'POST')
export const PATCH  = (req: NextRequest) => proxy(req, 'PATCH')
export const DELETE = (req: NextRequest) => proxy(req, 'DELETE')
export const PUT    = (req: NextRequest) => proxy(req, 'PUT')
