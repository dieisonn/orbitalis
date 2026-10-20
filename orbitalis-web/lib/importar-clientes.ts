// Leitura de planilhas de clientes (qualquer sistema): reconhece as colunas pelo nome,
// junta várias planilhas e avisa o que está duplicado, sem documento ou inválido.

export type ClienteImportado = {
  razaoSocial: string
  nomeFantasia?: string
  documento?: string
  endereco?: string
  telefone?: string
  celular?: string
  email?: string
  cidade?: string
  uf?: string
  origem: string // arquivo (e linha) de onde veio
}

export type AvisoImportacao = { nome: string; origem: string; texto: string }

export type ResumoLeitura = {
  clientes: ClienteImportado[]
  avisos: AvisoImportacao[]
  linhasLidas: number
  mesclados: number
  semDocumento: number
  arquivosIgnorados: { arquivo: string; motivo: string }[]
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const chaveCabecalho = (s: unknown) =>
  semAcento(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const chaveNome = (s: string) => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim()
const texto = (v: unknown) => {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}
const digitos = (s: string) => s.replace(/\D/g, '')

const CAMPOS: Record<string, string[]> = {
  nome: ['nome nome fantasia', 'nome fantasia', 'fantasia', 'nome', 'cliente', 'nome do cliente'],
  razao: ['razao social', 'razaosocial', 'razao'],
  tipo: ['tipo', 'tipo de pessoa', 'pessoa'],
  cpf: ['cpf'],
  cnpj: ['cnpj'],
  documento: ['documento', 'cpf cnpj', 'cnpj cpf', 'cpfcnpj'],
  ativo: ['ativo', 'situacao', 'status'],
  telefone: ['telefone', 'fone', 'tel', 'telefone fixo'],
  celular: ['celular', 'whatsapp', 'telefone celular'],
  email: ['e mail', 'email', 'e mail principal'],
  cep: ['cep'],
  logradouro: ['logradouro', 'endereco', 'rua'],
  numero: ['numero', 'n', 'num'],
  complemento: ['complemento'],
  bairro: ['bairro'],
  cidade: ['cidade', 'municipio'],
  uf: ['estado', 'uf'],
}

function mapearColunas(cabecalho: unknown[]): Record<string, number> {
  const chaves = cabecalho.map(chaveCabecalho)
  const mapa: Record<string, number> = {}
  for (const [campo, apelidos] of Object.entries(CAMPOS)) {
    for (const ap of apelidos) {
      const i = chaves.indexOf(ap)
      if (i !== -1) { mapa[campo] = i; break }
    }
  }
  return mapa
}

function numeros(s: string): string[] {
  return s.split(/[\/;,]| ou /i).map((t) => t.trim()).filter((t) => digitos(t).length >= 8)
}

function montarEndereco(p: { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string }) {
  const rua = [p.logradouro, p.numero].filter(Boolean).join(', ')
  const compl = p.complemento.replace(/[;\s]+$/, '')
  const partes = [
    compl && rua ? `${rua} - ${compl}` : rua || compl,
    p.bairro,
    p.cidade ? (p.uf ? `${p.cidade}/${p.uf}` : p.cidade) : '',
    p.cep ? `CEP ${p.cep}` : '',
  ].filter(Boolean)
  return partes.join(', ')
}

/** Converte as linhas de UMA planilha (primeira linha = cabeçalho) em clientes. */
export function lerLinhas(
  arquivo: string,
  linhas: unknown[][],
  avisos: AvisoImportacao[],
): { clientes: ClienteImportado[]; lidas: number; erro?: string } {
  if (linhas.length === 0) return { clientes: [], lidas: 0, erro: 'Planilha vazia' }
  const col = mapearColunas(linhas[0])
  if (col.nome === undefined && col.razao === undefined) {
    return { clientes: [], lidas: 0, erro: 'Não achei a coluna de nome (ex.: "Nome", "Razão social")' }
  }
  const pega = (l: unknown[], campo: string) => (col[campo] === undefined ? '' : texto(l[col[campo]]))

  const clientes: ClienteImportado[] = []
  let lidas = 0
  linhas.slice(1).forEach((l, idx) => {
    if (!l || l.every((c) => texto(c) === '')) return
    lidas++
    const origem = `${arquivo} (linha ${idx + 2})`
    const nome = pega(l, 'nome')
    const razao = pega(l, 'razao')
    const razaoSocial = razao || nome
    if (!razaoSocial) { avisos.push({ nome: '(sem nome)', origem, texto: 'Linha sem nome, não importada' }); return }

    const ativo = chaveCabecalho(pega(l, 'ativo'))
    if (['nao', 'n', 'inativo', 'false', '0'].includes(ativo)) {
      avisos.push({ nome: razaoSocial, origem, texto: 'Marcado como inativo na planilha, não importado' })
      return
    }

    const tipo = pega(l, 'tipo').toUpperCase()
    let bruto = pega(l, 'documento')
    const cpf = pega(l, 'cpf'), cnpj = pega(l, 'cnpj')
    if (!bruto) bruto = tipo === 'PJ' ? cnpj || cpf : cpf || cnpj
    let documento: string | undefined = digitos(bruto) || undefined
    if (documento && documento.length !== 11 && documento.length !== 14) {
      avisos.push({ nome: razaoSocial, origem, texto: `Documento "${bruto}" tem ${documento.length} dígitos: importado sem documento` })
      documento = undefined
    }

    const fones = numeros(pega(l, 'telefone'))
    const celulares = numeros(pega(l, 'celular'))
    const telefone = fones[0]
    const celular = [...celulares, ...fones].find((n) => digitos(n) !== digitos(telefone ?? ''))

    const cidade = pega(l, 'cidade')
    const uf = pega(l, 'uf').toUpperCase().slice(0, 2)
    const endereco = montarEndereco({
      cep: pega(l, 'cep'), logradouro: pega(l, 'logradouro'), numero: pega(l, 'numero'),
      complemento: pega(l, 'complemento'), bairro: pega(l, 'bairro'), cidade, uf,
    })

    clientes.push({
      razaoSocial,
      nomeFantasia: nome && chaveNome(nome) !== chaveNome(razaoSocial) ? nome : undefined,
      documento,
      endereco: endereco || undefined,
      telefone: telefone?.slice(0, 20),
      celular: celular?.slice(0, 20),
      email: pega(l, 'email').split(/[;,\s]+/)[0] || undefined,
      cidade: cidade || undefined,
      uf: uf || undefined,
      origem,
    })
  })
  return { clientes, lidas }
}

const CAMPOS_MESCLA: (keyof ClienteImportado)[] = [
  'nomeFantasia', 'endereco', 'telefone', 'celular', 'email', 'cidade', 'uf',
]

/** Junta os clientes de várias planilhas: mesmo documento ou mesmo nome = mesmo cliente. */
export function consolidar(
  porArquivo: { arquivo: string; linhas: unknown[][] }[],
  ignorados: { arquivo: string; motivo: string }[] = [],
): ResumoLeitura {
  const avisos: AvisoImportacao[] = []
  const finais: ClienteImportado[] = []
  const porDoc = new Map<string, ClienteImportado>()
  const porNome = new Map<string, ClienteImportado>()
  let linhasLidas = 0
  let mesclados = 0
  const arquivosIgnorados = [...ignorados]

  const mesclar = (alvo: ClienteImportado, novo: ClienteImportado) => {
    for (const k of CAMPOS_MESCLA) {
      if (!alvo[k] && novo[k]) (alvo as Record<string, unknown>)[k] = novo[k]
    }
    if (!alvo.documento && novo.documento) { alvo.documento = novo.documento; porDoc.set(novo.documento, alvo) }
    mesclados++
  }

  for (const { arquivo, linhas } of porArquivo) {
    const r = lerLinhas(arquivo, linhas, avisos)
    if (r.erro) { arquivosIgnorados.push({ arquivo, motivo: r.erro }); continue }
    linhasLidas += r.lidas
    for (const c of r.clientes) {
      const nomeKey = chaveNome(c.razaoSocial)
      const mesmoDoc = c.documento ? porDoc.get(c.documento) : undefined
      if (mesmoDoc) {
        avisos.push({ nome: c.razaoSocial, origem: c.origem, texto: `Mesmo documento de "${mesmoDoc.razaoSocial}" (${mesmoDoc.origem}): juntado em um só` })
        mesclar(mesmoDoc, c); continue
      }
      const mesmoNome = porNome.get(nomeKey)
      if (mesmoNome && (!mesmoNome.documento || !c.documento)) {
        mesclar(mesmoNome, c); continue
      }
      finais.push(c)
      if (c.documento) porDoc.set(c.documento, c)
      if (!mesmoNome) porNome.set(nomeKey, c)
    }
  }

  return {
    clientes: finais,
    avisos,
    linhasLidas,
    mesclados,
    semDocumento: finais.filter((c) => !c.documento).length,
    arquivosIgnorados,
  }
}
