export const LIMITES = [20, 50, 100]
export const LIMITE_PADRAO = 50

/** Lê ?pagina e ?limite da URL; limite só aceita 20, 50 ou 100. */
export const lerPaginacao = (pagina?: string, limite?: string) => {
  const l = Number(limite)
  return { pagina: Math.max(1, Number(pagina) || 1), limite: LIMITES.includes(l) ? l : LIMITE_PADRAO }
}
