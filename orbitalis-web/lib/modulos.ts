// Módulos de acesso da equipe do escritório. Mesma lista da API (orbitalis-api/src/common/modulos.ts).
export const MODULOS = [
  { key: 'agenda',         label: 'Agenda',                  desc: 'Calendário de eventos e visitas' },
  { key: 'ordens_servico', label: 'Ordens de serviço',       desc: 'Abrir, triar, executar e acompanhar O.S.' },
  { key: 'clientes',       label: 'Clientes e equipamentos', desc: 'Clientes, ambientes e equipamentos' },
  { key: 'planos',         label: 'Planos e contratos',      desc: 'Planos preventivos e contratos' },
  { key: 'orcamentos',     label: 'Orçamentos',              desc: 'Criar e enviar orçamentos' },
  { key: 'financeiro',     label: 'Financeiro',              desc: 'Valores, custos e resultados' },
  { key: 'relatorios',     label: 'Relatórios',              desc: 'Exportações, PMOC e confiabilidade' },
  { key: 'equipe',         label: 'Equipe e usuários',       desc: 'Adicionar usuários e definir acessos' },
  { key: 'configuracoes',  label: 'Configurações',           desc: 'Empresa, marca, checklists e tipos de serviço' },
] as const

export type ModuloKey = (typeof MODULOS)[number]['key']

export const PERFIS: Record<string, { label: string; desc: string; modulos: ModuloKey[] | null }> = {
  administrador: { label: 'Administrador', desc: 'Acesso total, inclusive financeiro, configurações e equipe.', modulos: null },
  gestor:        { label: 'Gestor operacional', desc: 'Operação completa (agenda, O.S., clientes, planos, orçamentos, relatórios). Sem financeiro, configurações e equipe.', modulos: ['agenda', 'ordens_servico', 'clientes', 'planos', 'orcamentos', 'relatorios'] },
  financeiro:    { label: 'Financeiro', desc: 'Financeiro, orçamentos, contratos, clientes e relatórios. Sem operação de campo.', modulos: ['clientes', 'planos', 'orcamentos', 'financeiro', 'relatorios'] },
  atendimento:   { label: 'Atendimento', desc: 'Agenda, O.S. e clientes. Sem valores, contratos, relatórios e ajustes.', modulos: ['agenda', 'ordens_servico', 'clientes'] },
  personalizado: { label: 'Personalizado', desc: 'Você escolhe os módulos.', modulos: [] },
}

// prefixo da rota → módulo (vale o prefixo mais específico). Painel, alertas e perfil são livres.
const ROTAS: [string, ModuloKey][] = [
  ['/agenda', 'agenda'],
  ['/ordens-servico', 'ordens_servico'],
  ['/clientes', 'clientes'], ['/ambientes', 'clientes'], ['/equipamentos', 'clientes'],
  ['/equipamentos/confiabilidade', 'relatorios'],
  ['/planos-manutencao', 'planos'], ['/contratos', 'planos'],
  ['/orcamentos', 'orcamentos'],
  ['/financeiro', 'financeiro'],
  ['/relatorios', 'relatorios'],
  ['/usuarios', 'equipe'], ['/equipe', 'equipe'], ['/tecnicos', 'equipe'],
  ['/configuracoes', 'configuracoes'], ['/checklists', 'configuracoes'], ['/servicos', 'configuracoes'],
]

export function moduloDaRota(path: string): ModuloKey | null {
  let melhor: [string, ModuloKey] | null = null
  for (const r of ROTAS) {
    if ((path === r[0] || path.startsWith(r[0] + '/')) && (!melhor || r[0].length > melhor[0].length)) melhor = r
  }
  return melhor ? melhor[1] : null
}

// acesso: null = tudo; lista = módulos liberados
export function rotaPermitida(path: string, acesso: string[] | null): boolean {
  if (!acesso) return true
  const m = moduloDaRota(path)
  return !m || acesso.includes(m)
}
