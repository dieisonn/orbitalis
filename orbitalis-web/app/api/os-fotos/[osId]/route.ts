import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

// Envia uma foto da O.S. (o navegador manda a imagem já reduzida; aqui só entra o token)
export async function POST(request: NextRequest, { params }: { params: Promise<{ osId: string }> }) {
  const token = (await cookies()).get('orbitalis_token')?.value
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const { osId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(osId)) return NextResponse.json({ message: 'O.S. inválida' }, { status: 400 })
  const res = await fetch(`${BACKEND}/ordens-servico/${osId}/fotos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
