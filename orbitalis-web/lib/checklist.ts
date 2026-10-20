// Regras de escolha de checklist (espelham orbitalis-api/src/common/checklist-resolver.ts)

export type TipoOs = 'preventiva' | 'corretiva'

export type ModeloResumo = {
  id: string
  nome: string
  tipo: TipoOs | null
  tipoServicoId: string | null
}

export const TIPO_OS_LABEL: Record<TipoOs, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
}

/**
 * Modelo que o sistema escolhe sozinho quando o usuário não escolhe um:
 * mesmo serviço + mesmo tipo > mesmo serviço (sem tipo) > mesmo tipo (sem serviço).
 * Nunca usa um modelo de outro caso.
 */
export function sugerirModelo(
  modelos: ModeloResumo[],
  tipo: TipoOs | null,
  tipoServicoId: string | null,
): ModeloResumo | null {
  const pontos = (m: ModeloResumo) => {
    const servicoBate = !!tipoServicoId && m.tipoServicoId === tipoServicoId
    const tipoBate = !!tipo && m.tipo === tipo
    if (servicoBate && tipoBate) return 4
    if (servicoBate && m.tipo === null) return 3
    if (!m.tipoServicoId && tipoBate) return 2
    return 0
  }
  return (
    [...modelos]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((m) => ({ m, p: pontos(m) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)[0]?.m ?? null
  )
}
