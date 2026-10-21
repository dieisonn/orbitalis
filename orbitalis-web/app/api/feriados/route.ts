import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Busca feriados (nacionais, estaduais e municipais) de uma cidade na FeriadosAPI.
// Precisa da variável de ambiente FERIADOS_API_TOKEN na Vercel. O plano gratuito da FeriadosAPI
// cobre as capitais; outras cidades dependem do plano deles.
export async function GET(request: NextRequest) {
  if (!(await cookies()).get('orbitalis_token')?.value) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }
  const token = process.env.FERIADOS_API_TOKEN
  if (!token) {
    return NextResponse.json({ message: 'A busca automática ainda não foi ativada (falta FERIADOS_API_TOKEN na Vercel). Você pode cadastrar os feriados municipais à mão.' }, { status: 501 })
  }
  const ibge = request.nextUrl.searchParams.get('ibge') ?? ''
  const ano = request.nextUrl.searchParams.get('ano') ?? ''
  if (!/^\d{7}$/.test(ibge) || !/^\d{4}$/.test(ano)) {
    return NextResponse.json({ message: 'Informe o código IBGE (7 dígitos) e o ano.' }, { status: 400 })
  }

  const saida: { data: string; nome: string; tipo: string }[] = []
  try {
    for (let pagina = 1; pagina <= 5; pagina++) {
      const res = await fetch(`https://feriadosapi.com/api/v1/feriados/cidade/${ibge}?ano=${ano}&page=${pagina}&per_page=100`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      })
      if (!res.ok) {
        const msg = res.status === 401 || res.status === 403 ? 'Token da FeriadosAPI recusado ou sem acesso a esta cidade.' : `FeriadosAPI respondeu ${res.status}.`
        return NextResponse.json({ message: msg }, { status: 502 })
      }
      const dados = await res.json()
      for (const x of dados?.feriados ?? []) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(x.data))
        if (m) saida.push({ data: `${m[3]}-${m[2]}-${m[1]}`, nome: String(x.nome), tipo: String(x.tipo ?? '').toLowerCase() })
      }
      if (pagina >= (dados?.meta?.total_pages ?? 1)) break
    }
  } catch {
    return NextResponse.json({ message: 'Não foi possível falar com a FeriadosAPI agora.' }, { status: 502 })
  }
  return NextResponse.json(saida)
}
