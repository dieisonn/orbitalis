// Ordenação de listagens por coluna (?ordem=&dir=). Só aceita colunas da lista branca de cada módulo.
export type Dir = 'asc' | 'desc';

/**
 * Monta o orderBy do Prisma. `campos` mapeia o nome da coluna → função que devolve o orderBy daquele campo.
 * Sempre termina com `id` para a paginação ser estável. Valor inválido cai no padrão.
 */
export function montarOrdem(
  campos: Record<string, (dir: Dir) => Record<string, unknown>>,
  padrao: { ordem: string; dir: Dir },
  ordem?: string,
  dir?: string,
): Record<string, unknown>[] {
  const nome = ordem && Object.prototype.hasOwnProperty.call(campos, ordem) ? ordem : padrao.ordem;
  const d: Dir = nome === ordem ? (dir === 'desc' ? 'desc' : 'asc') : padrao.dir;
  return [campos[nome](d), { id: d }];
}
