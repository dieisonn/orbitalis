import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

async function getHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get('orbitalis_token')?.value
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${BASE}/orcamentos${qs ? `?${qs}` : ''}`, { headers: await getHeaders(), cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BASE}/orcamentos`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
