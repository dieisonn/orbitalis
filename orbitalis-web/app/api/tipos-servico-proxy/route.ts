import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

async function proxy(request: NextRequest, method: string) {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const path = request.nextUrl.searchParams.get('path') ?? '/tipos-servico'
  const hasBody = ['POST', 'PATCH', 'PUT'].includes(method)
  const body = hasBody ? await request.text() : undefined

  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
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
