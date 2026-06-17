import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function GET(req: NextRequest) {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value

  const params = req.nextUrl.searchParams.toString()
  const res = await fetch(`${BASE}/relatorios/os-export?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: res.status })
  }

  const blob = await res.blob()
  const filename = `ordens-servico-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
