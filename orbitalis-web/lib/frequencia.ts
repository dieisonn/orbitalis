// Periodicidade dos planos, guardada em dias. Múltiplos de 30 avançam por mês de calendário na geração.
export const FREQUENCIAS_PADRAO = [
  { label: 'Mensal', value: 30 },
  { label: 'Bimestral', value: 60 },
  { label: 'Trimestral', value: 90 },
  { label: 'Quadrimestral', value: 120 },
  { label: 'Semestral', value: 180 },
  { label: 'Anual', value: 365 },
]

export function rotuloFrequencia(dias: number): string {
  const padrao = FREQUENCIAS_PADRAO.find((f) => f.value === dias)
  if (padrao) return padrao.label
  if (dias > 0 && dias % 30 === 0) return `A cada ${dias / 30} meses`
  return `A cada ${dias} dias`
}
