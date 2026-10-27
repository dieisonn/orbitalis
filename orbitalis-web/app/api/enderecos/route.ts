import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Sugestões de endereço para o Brasil, sem chave nem conta:
//  • CEP (8 dígitos) → BrasilAPI/ViaCEP (rua, bairro, cidade e UF exatos)
//  • texto → OpenStreetMap (Photon), com preferência pela cidade da empresa e o número digitado preservado
// Só para quem está logado; as consultas ficam em cache para não repetir.

const UF: Record<string, string> = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', Pará: 'PA', Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondônia: 'RO', Roraima: 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
}
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const UA = { 'User-Agent': 'Orbitalis/1.0 (orbitalis.com.br)' }

type Feature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> }
type Sugestao = { rotulo: string; cidade: string }

// "R. Pref. Camundinho, 861" → "Rua Prefeito Camundinho, 861"
function expandir(q: string) {
  return q
    .replace(/\b(r|rua)\.?\s+(?=\S)/i, 'Rua ')
    .replace(/\bav\.?\s+/i, 'Avenida ')
    .replace(/\bpç[a.]?\.?\s+/i, 'Praça ')
    .replace(/\brod\.?\s+/i, 'Rodovia ')
    .replace(/\bal\.?\s+/i, 'Alameda ')
    .replace(/\btrav\.?\s+/i, 'Travessa ')
    .replace(/\bpref\.?\s+/i, 'Prefeito ')
    .replace(/\bdr\.?\s+/i, 'Doutor ')
    .replace(/\bprof\.?\s+/i, 'Professor ')
    .replace(/\bcel\.?\s+/i, 'Coronel ')
    .replace(/\bgov\.?\s+/i, 'Governador ')
    .replace(/\bpres\.?\s+/i, 'Presidente ')
}

async function porCep(cep: string): Promise<Sugestao[]> {
  const fmt = `${cep.slice(0, 5)}-${cep.slice(5)}`
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      const d = (await r.json()) as { street?: string; neighborhood?: string; city?: string; state?: string }
      if (d.city) return [{ rotulo: [d.street, d.neighborhood, `${d.city} - ${d.state}`, fmt].filter(Boolean).join(', '), cidade: d.city }]
    }
  } catch { /* tenta o ViaCEP */ }
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) })
    const d = (await r.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean }
    if (!d.erro && d.localidade) return [{ rotulo: [d.logradouro, d.bairro, `${d.localidade} - ${d.uf}`, fmt].filter(Boolean).join(', '), cidade: d.localidade }]
  } catch { /* sem resultado */ }
  return []
}

async function photon(params: string): Promise<Feature[]> {
  try {
    const r = await fetch(`https://photon.komoot.io/api/?${params}&limit=10`, { headers: UA, next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return []
    return ((await r.json()) as { features?: Feature[] }).features ?? []
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!(await cookies()).get('orbitalis_token')?.value) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim().slice(0, 120)
  const cidade = (sp.get('cidade') ?? '').trim().slice(0, 80)
  const uf = (sp.get('uf') ?? '').trim().slice(0, 2).toUpperCase()
  if (q.length < 4) return NextResponse.json([])

  const digitos = q.replace(/\D/g, '')
  if (/^\d{5}-?\d{3}$/.test(q) || (digitos.length === 8 && digitos === q.replace(/[\s.-]/g, ''))) {
    return NextResponse.json((await porCep(digitos)).map((s) => ({ rotulo: s.rotulo })))
  }

  const texto = expandir(q)
  const numero = texto.match(/(?:,|\s)\s*(?:n[º°o.]*\s*)?(\d{1,5})\s*$/i)?.[1]   // número digitado ao fim
  const ruaDigitada = numero ? texto.replace(/(?:,|\s)\s*(?:n[º°o.]*\s*)?\d{1,5}\s*$/i, '').trim() : texto
  const BR = 'bbox=-74,-34,-34,5.5'

  // Centro da cidade da empresa: as sugestões da região vêm primeiro
  let viés = ''
  if (cidade) {
    const c = (await photon(`q=${encodeURIComponent(`${cidade}, ${uf}`)}&${BR}`))[0]?.geometry?.coordinates
    if (c) viés = `&lon=${c[0]}&lat=${c[1]}&location_bias_scale=0.6&zoom=12`
  }
  const [naRegiao, geral] = await Promise.all([
    cidade ? photon(`q=${encodeURIComponent(`${ruaDigitada} ${cidade}`)}&${BR}${viés}`) : Promise.resolve([] as Feature[]),
    photon(`q=${encodeURIComponent(ruaDigitada)}&${BR}${viés}`),
  ])

  const alvo = semAcento(cidade)
  const vistos = new Set<string>()
  const lista: Sugestao[] = []
  for (const f of [...naRegiao, ...geral]) {
    const p = f.properties ?? {}
    if (p.countrycode && p.countrycode !== 'BR') continue
    const cid = p.city ?? p.town ?? p.village ?? p.county ?? ''
    const rua = p.street ?? (p.type === 'street' || p.osm_key === 'highway' ? p.name : undefined)
    if (!cid || (!rua && !p.name)) continue
    const num = p.housenumber ?? (rua ? numero : undefined)
    const estado = p.state ? (UF[p.state] ?? p.state) : uf
    const via = rua ? [rua, num].filter(Boolean).join(', ') : p.name
    const rotulo = [via, p.district ?? p.locality, `${cid}${estado ? ` - ${estado}` : ''}`, p.postcode].filter(Boolean).join(', ')
    if (vistos.has(rotulo)) continue
    vistos.add(rotulo)
    lista.push({ rotulo, cidade: cid })
  }
  // cidade da empresa primeiro (mantém a ordem de relevância dentro de cada grupo)
  const ordenada = alvo ? [...lista.filter((s) => semAcento(s.cidade) === alvo), ...lista.filter((s) => semAcento(s.cidade) !== alvo)] : lista
  return NextResponse.json(ordenada.slice(0, 8).map((s) => ({ rotulo: s.rotulo })))
}
