import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
// só estes recursos/ações passam por aqui (o token do admin é lido do cookie)
const RECURSOS: Record<string, { rota: string; arquivo: string; modelo: string }> = {
  'catalogo-servicos': { rota: 'catalogo-servicos', arquivo: 'Servicos.xlsx', modelo: 'Importacao_Modelo_Servicos.xlsx' },
  produtos: { rota: 'produtos', arquivo: 'Produtos.xlsx', modelo: 'Importacao_Modelo_Produtos.xlsx' },
}
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type Ctx = { params: Promise<{ recurso: string; acao: string }> }

async function token() {
  return (await cookies()).get('orbitalis_token')?.value
}

/** GET exportar | modelo-importacao → baixa o .xlsx */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { recurso, acao } = await params
  const r = RECURSOS[recurso]
  if (!r || (acao !== 'exportar' && acao !== 'modelo-importacao')) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const t = await token()
  const res = await fetch(`${BASE}/${r.rota}/${acao}`, { headers: t ? { Authorization: `Bearer ${t}` } : {}, cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Não foi possível gerar a planilha' }, { status: res.status })
  return new NextResponse(await res.blob(), {
    headers: { 'Content-Type': XLSX, 'Content-Disposition': `attachment; filename="${acao === 'exportar' ? r.arquivo : r.modelo}"` },
  })
}

/** POST importar (multipart: arquivo + simular) → repassa à API e devolve o resultado em JSON */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { recurso, acao } = await params
  const r = RECURSOS[recurso]
  if (!r || acao !== 'importar') return NextResponse.json({ message: 'Não encontrado' }, { status: 404 })
  const form = await req.formData().catch(() => null)
  const arquivo = form?.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ message: 'Envie uma planilha .xlsx' }, { status: 400 })
  if (!arquivo.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ message: 'O arquivo precisa ser .xlsx (Excel).' }, { status: 400 })
  if (arquivo.size > 4 * 1024 * 1024) return NextResponse.json({ message: 'Arquivo acima de 4 MB.' }, { status: 413 })
  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString('base64')
  const t = await token()
  const res = await fetch(`${BASE}/${r.rota}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify({ arquivoBase64: base64, simular: form?.get('simular') !== 'false' }),
    cache: 'no-store',
  })
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) {
    const m = Array.isArray(corpo.message) ? corpo.message[0] : corpo.message
    return NextResponse.json({ message: m ?? 'Não foi possível importar' }, { status: res.status })
  }
  return NextResponse.json(corpo)
}
