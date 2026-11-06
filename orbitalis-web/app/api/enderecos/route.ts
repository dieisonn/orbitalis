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

// Municípios do Brasil (IBGE), para entender "…, patos de minas" mesmo sem UF. Lista pública, muda raramente.
type Municipios = Map<string, string[]>   // nome sem acento → UFs que têm cidade com esse nome
let municipiosCache: Municipios | null = null
async function municipios(): Promise<Municipios> {
  if (municipiosCache) return municipiosCache
  try {
    const r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome', { next: { revalidate: 60 * 60 * 24 * 30 }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return new Map()
    const lista = (await r.json()) as { nome: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } } }[]
    const m: Municipios = new Map()
    for (const c of lista) {
      const ufc = c.microrregiao?.mesorregiao?.UF?.sigla
      if (!ufc) continue
      const k = semAcento(c.nome)
      m.set(k, [...(m.get(k) ?? []), ufc])
    }
    if (m.size > 5000) municipiosCache = m
    return m
  } catch { return new Map() }
}

// Se o texto (ou o fim dele) é o nome de uma cidade, devolve cidade e UF. Em empate de nome, vale a UF informada/da empresa.
function acharCidade(texto: string, mun: Municipios, ufPreferida: string): { cidade: string; uf: string; nome: string } | null {
  const t = semAcento(texto).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || !mun.size) return null
  const ufs = mun.get(t)
  if (!ufs) return null
  const uf = ufPreferida && ufs.includes(ufPreferida) ? ufPreferida : ufs[0]
  return { cidade: t, uf, nome: texto.trim() }
}

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

// Busca de ruas pelo cadastro dos Correios (ViaCEP): nomes, bairros e CEPs oficiais, bem mais completo que o
// OpenStreetMap para o Brasil. Precisa de UF + cidade; o número digitado é acrescentado ao endereço.
async function porRua(uf: string, cidade: string, rua: string, numero?: string): Promise<Sugestao[]> {
  const termo = semAcento(rua).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!/^[A-Z]{2}$/.test(uf) || !cidade || termo.length < 3) return []
  try {
    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(semAcento(cidade))}/${encodeURIComponent(termo)}/json/`
    const r = await fetch(url, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return []
    const lista = (await r.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; cep?: string }[]
    if (!Array.isArray(lista)) return []
    const vistos = new Set<string>()
    const out: Sugestao[] = []
    for (const d of lista) {
      if (!d.logradouro || !d.localidade) continue
      const chave = `${d.logradouro}|${d.bairro}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      out.push({ rotulo: formatar(d.logradouro, numero, d.bairro, d.localidade, d.uf, d.cep), cidade: d.localidade })
    }
    return out
  } catch { return [] }
}

// Formato brasileiro, que o Google Maps entende bem: "Rua X, 19 - Bairro, Cidade - UF, 00000-000"
function formatar(via: string, numero?: string, bairro?: string, cidade?: string, uf?: string, cep?: string) {
  const rua = numero ? `${via}, ${numero}` : via
  return [bairro ? `${rua} - ${bairro}` : rua, cidade ? `${cidade}${uf ? ` - ${uf}` : ''}` : '', cep].filter(Boolean).join(', ')
}

async function photon(params: string): Promise<Feature[]> {
  try {
    const r = await fetch(`https://photon.komoot.io/api/?${params}&limit=10`, { headers: UA, next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return []
    return ((await r.json()) as { features?: Feature[] }).features ?? []
  } catch { return [] }
}

// Entende o que a pessoa digitou ou colou, em qualquer ordem comum:
//  "Rua X, 19", "R. X 19", "Rua X, 19 - Bairro, Cidade - MG, 38700-000", "Rua X, 327, Cidade, 38701-118, MG, BR"
// e separa rua, número, cidade e UF (os que faltarem vêm da cidade da empresa).
function interpretar(q: string, cidadeEmpresa: string, ufEmpresa: string) {
  let partes = q.split(',').map((x) => x.trim()).filter(Boolean)
  let uf = ''
  let cid = ''
  // país, CEP e UF soltos no fim/meio
  partes = partes.filter((x) => !/^(br|brasil|brazil)$/i.test(x) && !/^\d{5}-?\d{3}$/.test(x))
  const ultimo = partes[partes.length - 1] ?? ''
  if (partes.length > 1 && /^[A-Za-z]{2}$/.test(ultimo) && !/^(de|da|do)$/i.test(ultimo)) { uf = ultimo.toUpperCase(); partes.pop() }
  // "Cidade - UF" no fim
  const m = (partes[partes.length - 1] ?? '').match(/^(.+?)\s+-\s+([A-Za-z]{2})$/)
  if (m) { cid = m[1].trim(); uf = m[2].toUpperCase(); partes.pop() }
  else if (uf && partes.length > 1) cid = partes.pop() as string
  // sobra "Rua X", "19", ("- Bairro", bairro): rua é a primeira parte
  let rua = (partes[0] ?? '').replace(/\s+-\s+[^\d]+$/, '')
  let numero: string | undefined
  let textoDepoisDoNumero = ''
  const num = (t: string) => t.match(/^(?:n[º°o.]*\s*)?(\d{1,5})(?:\s*-\s*.*)?$/i)?.[1]
  if (partes[1] && num(partes[1])) numero = num(partes[1])
  if (!numero) {
    // "R. X 19" (número colado no fim da rua)
    const colado = rua.match(/^(.*?\D)\s+(?:n[º°o.]*\s*)?(\d{1,5})$/i)
    if (colado) { rua = colado[1].trim(); numero = colado[2] }
    else {
      // "Rua X 234 Patos de Minas" (tudo sem vírgula): o que vem depois do número pode ser a cidade
      const meio = rua.match(/^(.*?\D)\s+(?:n[º°o.]*\s*)?(\d{1,5})\s+(\D.*)$/i)
      if (meio) { rua = meio[1].trim(); numero = meio[2]; textoDepoisDoNumero = meio[3].trim() }
    }
  }
  // Partes que sobraram depois de rua e número ("Bairro", "Cidade"), de trás para frente; e o texto depois do número colado
  const sobras = partes.slice(1).filter((x) => !num(x)).reverse()
  return { rua: expandir(rua), numero, cidade: cid || cidadeEmpresa, uf: uf || ufEmpresa, explicita: !!cid, ufExplicita: !!uf, sobras, textoDepoisDoNumero }
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

  const ia = interpretar(q, cidade, uf)
  const { rua: ruaDigitada, numero } = ia
  let { cidade: cidadeBusca, uf: ufBusca } = ia
  // Cidade digitada (com ou sem UF): vale a digitada, não a da empresa
  let cidadeDigitada = ia.explicita
  if (!cidadeDigitada) {
    const mun = await municipios()
    const candidatas = [ia.textoDepoisDoNumero, ...ia.sobras].filter(Boolean)
    for (const c of candidatas) {
      // "Bairro - Cidade" ou "Centro Patos de Minas": tenta o texto todo e depois só o fim
      const palavras = c.split(/\s+/)
      for (let i = 0; i < palavras.length && !cidadeDigitada; i++) {
        const ach = acharCidade(palavras.slice(i).join(' '), mun, ia.ufExplicita ? ia.uf : uf)
        if (ach) { cidadeBusca = ach.nome; ufBusca = ia.ufExplicita ? ia.uf : ach.uf; cidadeDigitada = true }
      }
      if (cidadeDigitada) break
    }
  }
  const BR = 'bbox=-74,-34,-34,5.5'
  const correios = await porRua(ufBusca, cidadeBusca, ruaDigitada, numero)

  // Centro da cidade da empresa: as sugestões da região vêm primeiro
  let viés = ''
  if (cidadeBusca) {
    const c = (await photon(`q=${encodeURIComponent(`${cidadeBusca}, ${ufBusca}`)}&${BR}`))[0]?.geometry?.coordinates
    if (c) viés = `&lon=${c[0]}&lat=${c[1]}&location_bias_scale=0.6&zoom=12`
  }
  const [naRegiao, geral] = await Promise.all([
    cidadeBusca ? photon(`q=${encodeURIComponent(`${ruaDigitada} ${cidadeBusca}`)}&${BR}${viés}`) : Promise.resolve([] as Feature[]),
    photon(`q=${encodeURIComponent(ruaDigitada)}&${BR}${viés}`),
  ])

  const alvo = semAcento(cidadeBusca)
  const vistos = new Set<string>()
  const lista: Sugestao[] = [...correios]
  for (const f of [...naRegiao, ...geral]) {
    const p = f.properties ?? {}
    if (p.countrycode && p.countrycode !== 'BR') continue
    const cid = p.city ?? p.town ?? p.village ?? p.county ?? ''
    const rua = p.street ?? (p.type === 'street' || p.osm_key === 'highway' ? p.name : undefined)
    if (!cid || (!rua && !p.name)) continue
    const num = p.housenumber ?? (rua ? numero : undefined)
    const estado = p.state ? (UF[p.state] ?? p.state) : uf
    const rotulo = rua ? formatar(rua, num, p.district ?? p.locality, cid, estado, p.postcode)
      : [p.name, p.district ?? p.locality, `${cid}${estado ? ` - ${estado}` : ''}`, p.postcode].filter(Boolean).join(', ')
    if (vistos.has(rotulo)) continue
    vistos.add(rotulo)
    lista.push({ rotulo, cidade: cid })
  }
  // cidade primeiro (mantém a ordem de relevância dentro de cada grupo); se a pessoa digitou a cidade,
  // só ela: sugerir a mesma rua em outras cidades do país atrapalha mais do que ajuda
  const daCidade = alvo ? lista.filter((s) => semAcento(s.cidade) === alvo) : []
  const ordenada = alvo
    ? cidadeDigitada && daCidade.length ? daCidade : [...daCidade, ...lista.filter((s) => semAcento(s.cidade) !== alvo)]
    : lista
  const vistosFinal = new Set<string>()
  const unica = ordenada.filter((s) => { const k = semAcento(s.rotulo).replace(/[^a-z0-9]/g, ''); if (vistosFinal.has(k)) return false; vistosFinal.add(k); return true })
  return NextResponse.json(unica.slice(0, 8).map((s) => ({ rotulo: s.rotulo })))
}
