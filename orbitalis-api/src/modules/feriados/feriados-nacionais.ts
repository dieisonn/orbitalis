// Feriados nacionais do Brasil, calculados (sem depender de serviço externo nem de cadastro).
// Fixos + móveis a partir da Páscoa. "facultativo" = ponto facultativo (não é feriado por lei federal).

export type TipoFeriadoCalculado = 'nacional' | 'facultativo';
export type FeriadoCalculado = { data: string; nome: string; tipo: TipoFeriadoCalculado }; // data = YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const somar = (d: Date, dias: number) => new Date(d.getTime() + dias * 86_400_000);

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
export function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function feriadosNacionais(ano: number): FeriadoCalculado[] {
  const p = pascoa(ano);
  const fixo = (m: number, d: number, nome: string): FeriadoCalculado => ({ data: `${ano}-${pad(m)}-${pad(d)}`, nome, tipo: 'nacional' });
  const lista: FeriadoCalculado[] = [
    fixo(1, 1, 'Confraternização Universal'),
    { data: iso(somar(p, -48)), nome: 'Carnaval (segunda-feira)', tipo: 'facultativo' },
    { data: iso(somar(p, -47)), nome: 'Carnaval (terça-feira)', tipo: 'facultativo' },
    { data: iso(somar(p, -2)), nome: 'Sexta-feira Santa', tipo: 'nacional' },
    fixo(4, 21, 'Tiradentes'),
    fixo(5, 1, 'Dia do Trabalho'),
    { data: iso(somar(p, 60)), nome: 'Corpus Christi', tipo: 'facultativo' },
    fixo(9, 7, 'Independência do Brasil'),
    fixo(10, 12, 'Nossa Senhora Aparecida'),
    fixo(11, 2, 'Finados'),
    fixo(11, 15, 'Proclamação da República'),
  ];
  if (ano >= 2024) lista.push(fixo(11, 20, 'Dia Nacional de Zumbi e da Consciência Negra'));
  lista.push(fixo(12, 25, 'Natal'));
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}
