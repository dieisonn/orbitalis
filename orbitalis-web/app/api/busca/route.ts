import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const token = (await cookies()).get('orbitalis_token')?.value

  const res = await fetch(`${BASE}/busca?q=${encodeURIComponent(q)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ clientes: [], ordens: [], equipamentos: [], ambientes: [] }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
