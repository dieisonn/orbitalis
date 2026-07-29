import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; acao: string }> },
) {
  const { token, acao } = await params
  if (!['aprovar', 'rejeitar'].includes(acao)) {
    return NextResponse.json({ message: 'Ação inválida' }, { status: 400 })
  }
  const res = await fetch(`${BASE}/orcamentos/publico/${token}/${acao}`, {
    method: 'POST',
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
