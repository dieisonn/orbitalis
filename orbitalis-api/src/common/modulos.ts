// Módulos de acesso da equipe do escritório (usuários tipo "admin").
// Perfil null/'administrador' = acesso total; os demais só entram nos módulos listados em `permissoes`.
export const MODULOS = [
  'agenda', 'ordens_servico', 'clientes', 'planos', 'orcamentos',
  'financeiro', 'relatorios', 'equipe', 'configuracoes',
] as const;
export type Modulo = (typeof MODULOS)[number];

export const PERFIS_PADRAO: Record<string, Modulo[]> = {
  gestor:      ['agenda', 'ordens_servico', 'clientes', 'planos', 'orcamentos', 'relatorios'],
  financeiro:  ['clientes', 'planos', 'orcamentos', 'financeiro', 'relatorios'],
  atendimento: ['agenda', 'ordens_servico', 'clientes'],
};
export const PERFIS_VALIDOS = ['administrador', 'gestor', 'financeiro', 'atendimento', 'personalizado'];

// Resolve (perfil, módulos) → o que gravar. null = acesso total.
export function resolverAcesso(perfil?: string | null, permissoes?: string[] | null): { perfilAcesso: string; permissoes: string[] } {
  const p = (perfil ?? 'administrador').toLowerCase();
  if (!PERFIS_VALIDOS.includes(p)) throw new Error('Perfil de acesso inválido');
  if (p === 'administrador') return { perfilAcesso: 'administrador', permissoes: [] };
  const lista = p === 'personalizado' ? (permissoes ?? []) : PERFIS_PADRAO[p];
  const invalidos = lista.filter((m) => !(MODULOS as readonly string[]).includes(m));
  if (invalidos.length) throw new Error(`Módulo inválido: ${invalidos.join(', ')}`);
  return { perfilAcesso: p, permissoes: Array.from(new Set(lista)) };
}

// null = acesso total
export const permissoesEfetivas = (perfil?: string | null, permissoes?: string[] | null): string[] | null =>
  !perfil || perfil === 'administrador' ? null : (permissoes ?? []);

// Quem concede acesso nunca dá mais do que tem: só admin com acesso total cria outro "administrador"
// e quem tem o módulo "equipe" só concede módulos que ele próprio possui.
export function podeConceder(quemConcede: string[] | null | undefined, acesso: { perfilAcesso: string; permissoes: string[] }): boolean {
  if (!Array.isArray(quemConcede)) return true; // acesso total
  if (!quemConcede.includes('equipe')) return false;
  if (acesso.perfilAcesso === 'administrador') return false;
  return acesso.permissoes.every((m) => quemConcede.includes(m));
}
