import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
type Ctx = { params: Promise<{ id: string; anexoId: string }> }

async function auth(): Promise<Record<string, string>> {
  const token = (await cookies()).get('orbitalis_token')?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Baixa o anexo (repassa tipo e nome do arquivo). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id, anexoId } = await params
  const res = await fetch(`${BASE}/orcamentos/${id}/anexos/${anexoId}`, { headers: await auth(), cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ message: 'Anexo não encontrado' }, { status: res.status })
  return new NextResponse(await res.blob(), {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment',
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, anexoId } = await params
  const res = await fetch(`${BASE}/orcamentos/${id}/anexos/${anexoId}`, { method: 'DELETE', headers: await auth() })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
