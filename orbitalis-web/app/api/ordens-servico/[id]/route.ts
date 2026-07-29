import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

async function getHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get('orbitalis_token')?.value
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${BASE}/ordens-servico/${id}`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
