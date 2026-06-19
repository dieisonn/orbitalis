import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function GET(request: NextRequest) {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const res = await fetch(`${BACKEND}/configuracao/google/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao obter URL' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
