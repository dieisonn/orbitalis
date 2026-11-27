import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
const MAX_BYTES = 3 * 1024 * 1024 // o site só repassa requisições de até ~4,5 MB; em base64 o arquivo cresce 33%

/** Recebe o arquivo (multipart), converte para base64 e repassa à API. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await req.formData().catch(() => null)
  const arquivo = form?.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ message: 'Escolha um arquivo' }, { status: 400 })
  if (arquivo.size > MAX_BYTES) return NextResponse.json({ message: 'Arquivo maior que 3 MB' }, { status: 400 })
  const token = (await cookies()).get('orbitalis_token')?.value
  const res = await fetch(`${BASE}/orcamentos/${id}/anexos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      nome: arquivo.name, tipo: arquivo.type || 'application/octet-stream',
      conteudoBase64: Buffer.from(await arquivo.arrayBuffer()).toString('base64'),
    }),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
