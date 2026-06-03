import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

// POST /api/ordens-servico — proxy autenticado com redirect HTTP real (não soft nav)
// Form nativo posta aqui; em sucesso retorna 303 para /historico (full page reload).
export async function POST(request: NextRequest) {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Lê tanto JSON (fetch API) quanto FormData (form nativo)
  let body: Record<string, unknown>
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    body = await request.json()
  } else {
    const fd = await request.formData()
    body = {
      ambienteId:       fd.get('ambienteId') as string,
      origem:           (fd.get('origem') as string) ?? 'portal_cliente',
      dataAgendamento:  (fd.get('dataAgendamento') as string) ?? new Date().toISOString(),
      observacoesGerais: fd.get('observacoesGerais') as string | undefined,
    }
  }

  const res = await fetch(`${BACKEND}/ordens-servico`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Redireciona de volta com erro na query string para o form exibir
    const backUrl = new URL('/abrir-chamado', request.url)
    backUrl.searchParams.set('erro', err.message ?? `Erro ${res.status}`)
    return NextResponse.redirect(backUrl, 303)
  }

  // Sucesso: redirect HTTP real para /historico (inclui cookies — proxy funciona)
  return NextResponse.redirect(new URL('/historico', request.url), 303)
}
