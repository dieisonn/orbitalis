import { type Dia, somarDias, chaveDia } from './agenda'

export type TipoFeriado = 'nacional' | 'facultativo' | 'estadual' | 'municipal'
export type Feriado = { data: Dia; nome: string; tipo: TipoFeriado }

export const ROTULO_FERIADO: Record<TipoFeriado, string> = {
  nacional: 'Feriado nacional', facultativo: 'Ponto facultativo', estadual: 'Feriado estadual', municipal: 'Feriado municipal',
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher) */
export function pascoa(ano: number): Dia {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return { y: ano, m: mes - 1, d: dia }
}

/** Feriados nacionais do ano, calculados aqui (sem depender de internet). */
export function feriadosNacionais(ano: number): Feriado[] {
  const p = pascoa(ano)
  const f = (m: number, d: number, nome: string): Feriado => ({ data: { y: ano, m: m - 1, d }, nome, tipo: 'nacional' })
  const lista: Feriado[] = [
    f(1, 1, 'Confraternização Universal'),
    { data: somarDias(p, -48), nome: 'Carnaval (segunda-feira)', tipo: 'facultativo' },
    { data: somarDias(p, -47), nome: 'Carnaval (terça-feira)', tipo: 'facultativo' },
    { data: somarDias(p, -2), nome: 'Sexta-feira Santa', tipo: 'nacional' },
    f(4, 21, 'Tiradentes'),
    f(5, 1, 'Dia do Trabalho'),
    { data: somarDias(p, 60), nome: 'Corpus Christi', tipo: 'facultativo' },
    f(9, 7, 'Independência do Brasil'),
    f(10, 12, 'Nossa Senhora Aparecida'),
    f(11, 2, 'Finados'),
    f(11, 15, 'Proclamação da República'),
  ]
  if (ano >= 2024) lista.push(f(11, 20, 'Dia da Consciência Negra'))
  lista.push(f(12, 25, 'Natal'))
  return lista.sort((a, b) => chaveDia(a.data).localeCompare(chaveDia(b.data)))
}
