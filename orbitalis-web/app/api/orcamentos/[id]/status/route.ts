import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

/** Troca manual de status (o token do admin vem do cookie). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get('orbitalis_token')?.value
  const res = await fetch(`${BASE}/orcamentos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(await req.json().catch(() => ({}))),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
