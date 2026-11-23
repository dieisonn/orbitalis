import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

async function chamar(path: string, method: string, body?: string) {
  const token = (await cookies()).get('orbitalis_token')?.value
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

// GET: últimos avisos + quantos não foram lidos · POST: marca como lidos ({ ids? } — sem ids, todos)
export const GET = () => chamar('/push/avisos', 'GET')
export async function POST(req: NextRequest) { return chamar('/push/avisos/lidos', 'POST', (await req.text()) || '{}') }
