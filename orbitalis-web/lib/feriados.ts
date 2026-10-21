// Feriados: tipos e rótulos. Os dados vêm da API (GET /feriados?ano=): nacionais calculados no
// servidor + os cadastrados pela empresa. Não há cálculo nem lista de feriados aqui no front.
import type { Dia } from './agenda'

export type TipoFeriado = 'nacional' | 'facultativo' | 'municipal' | 'estadual' | 'personalizado'
export type Feriado = {
  id?: string            // só nos cadastrados pela empresa (podem ser removidos)
  data: string           // YYYY-MM-DD
  nome: string
  tipo: TipoFeriado
  recorrente?: boolean   // repete todo ano
  lancado?: boolean      // já existe um evento FE na agenda nesse dia
}

export const ROTULO_FERIADO: Record<TipoFeriado, string> = {
  nacional: 'Feriado nacional',
  facultativo: 'Ponto facultativo',
  estadual: 'Feriado estadual',
  municipal: 'Feriado municipal',
  personalizado: 'Recesso da empresa',
}

export const diaDeFeriado = (f: Feriado): Dia => {
  const [y, m, d] = f.data.split('-').map(Number)
  return { y, m: m - 1, d }
}
