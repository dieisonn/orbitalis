import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get('orbitalis_token')?.value
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${BASE}/orcamentos/${id}/gerar-os`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
