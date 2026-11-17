/** Número da O.S. no padrão único da plataforma (painel, técnico e laudo): SIGLA-0123. */
export function numeroOs(os: { id: string; numero?: number | null; tipoServico?: { sigla: string } | null }): string {
  const n = os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase()
  return `${os.tipoServico?.sigla ?? 'OS'}-${n}`
}
