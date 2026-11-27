// Datas do financeiro: sempre 'aaaa-mm-dd' (dia civil de Brasília), gravadas como DATE.
export const hojeBR = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
export const diaUtc = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Soma meses mantendo o dia (31/01 + 1 mês = 28/02). */
export function somarMeses(dataIso: string, meses: number): string {
  const [a, m, d] = dataIso.split('-').map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return iso(alvo);
}

export function somarDias(dataIso: string, dias: number): string {
  return iso(new Date(diaUtc(dataIso).getTime() + dias * 86_400_000));
}

/** Datas de vencimento de N parcelas a partir da primeira. */
export function vencimentos(primeiro: string, n: number, intervalo: 'mensal' | 'quinzenal' | 'semanal' = 'mensal'): string[] {
  return Array.from({ length: n }, (_, i) =>
    intervalo === 'mensal' ? somarMeses(primeiro, i) : somarDias(primeiro, i * (intervalo === 'quinzenal' ? 15 : 7)),
  );
}

/** Divide o valor em N partes iguais; os centavos que sobram vão na última. */
export function dividirValor(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? r2(total - base * (n - 1)) : base));
}
