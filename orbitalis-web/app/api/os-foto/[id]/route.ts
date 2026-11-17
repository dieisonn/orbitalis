import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
const ID = /^[0-9a-f-]{36}$/i

// Mostra a foto (o navegador não envia o token sozinho no <img>, então passa por aqui)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('orbitalis_token')?.value
  const { id } = await params
  if (!token || !ID.test(id)) return new NextResponse('Não encontrada', { status: 404 })
  const res = await fetch(`${BACKEND}/ordens-servico/fotos/${id}/arquivo`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) return new NextResponse('Não encontrada', { status: 404 })
  return new NextResponse(await res.arrayBuffer(), {
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('orbitalis_token')?.value
  const { id } = await params
  if (!token || !ID.test(id)) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const res = await fetch(`${BACKEND}/ordens-servico/fotos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
