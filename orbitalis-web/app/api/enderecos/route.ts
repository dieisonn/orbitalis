import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Sugestões de endereço (OpenStreetMap via Photon) — só para quem está logado, e só no Brasil.
// Sem chave nem conta; o resultado é guardado em cache para não repetir a mesma consulta.
type Feature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> }

export async function GET(req: NextRequest) {
  if (!(await cookies()).get('orbitalis_token')?.value) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120)
  if (q.length < 4) return NextResponse.json([])

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=-74,-34,-34,5.5`
    const res = await fetch(url, { headers: { 'User-Agent': 'Orbitalis/1.0 (orbitalis.com.br)' }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return NextResponse.json([])
    const { features = [] } = (await res.json()) as { features?: Feature[] }
    const vistos = new Set<string>()
    const lista = features.flatMap((f) => {
      const p = f.properties ?? {}
      if (p.countrycode && p.countrycode !== 'BR') return []
      const rua = [p.street ?? p.name, p.housenumber].filter(Boolean).join(', ')
      const rotulo = [rua || p.name, p.district ?? p.locality, p.city ?? p.county, p.state, p.postcode].filter(Boolean).join(', ')
      if (!rotulo || vistos.has(rotulo)) return []
      vistos.add(rotulo)
      return [{ rotulo }]
    })
    return NextResponse.json(lista)
  } catch {
    return NextResponse.json([])
  }
}
