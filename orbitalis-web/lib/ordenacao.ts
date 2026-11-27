// Ordenação de listas por cabeçalho (módulo sem 'use client': serve ao servidor e ao navegador)
export type Dir = 'asc' | 'desc'
export type Ordem = { ordem: string; dir: Dir }

type SP = { ordem?: string | string[]; dir?: string | string[] } | undefined
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Lê ?ordem=&dir= (só aceita campos da lista permitida; senão usa o padrão). */
export function lerOrdem(sp: SP, permitidos: string[], padrao: Ordem): Ordem {
  const o = um(sp?.ordem)
  if (!o || !permitidos.includes(o)) return padrao
  return { ordem: o, dir: um(sp?.dir) === 'desc' ? 'desc' : 'asc' }
}

type Valor = string | number | boolean | Date | null | undefined
const coletor = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

function comparar(a: Valor, b: Valor): number {
  const va = a === undefined || a === '' ? null : a
  const vb = b === undefined || b === '' ? null : b
  if (va === null && vb === null) return 0
  if (va === null) return 1 // vazios sempre ao final
  if (vb === null) return -1
  if (va instanceof Date || vb instanceof Date) return new Date(va as string | Date).getTime() - new Date(vb as string | Date).getTime()
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  if (typeof va === 'boolean' && typeof vb === 'boolean') return Number(va) - Number(vb)
  return coletor.compare(String(va), String(vb))
}

/**
 * Ordena uma cópia da lista. `campos` diz como ler cada coluna; campo desconhecido mantém a ordem original.
 * Vazios ficam sempre ao final, em qualquer direção.
 */
export function ordenarLista<T>(lista: T[], { ordem, dir }: Ordem, campos: Record<string, (x: T) => Valor>): T[] {
  const get = campos[ordem]
  if (!get) return lista
  const f = dir === 'desc' ? -1 : 1
  return lista
    .map((x, i) => ({ x, i, v: get(x) }))
    .sort((p, q) => {
      const vazioP = p.v === null || p.v === undefined || p.v === ''
      const vazioQ = q.v === null || q.v === undefined || q.v === ''
      if (vazioP || vazioQ) return comparar(p.v, q.v) || p.i - q.i // vazios ao final, sem inverter
      return comparar(p.v, q.v) * f || p.i - q.i
    })
    .map((p) => p.x)
}
