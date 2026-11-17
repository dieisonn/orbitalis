/** Início do dia de hoje (Brasília) como data UTC, para comparar com datas que são só dia. */
export function inicioDoDiaBrasilia(agora: Date = new Date()): Date {
  const d = new Date(agora.getTime() - 3 * 3_600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Plano só é encerrado quando o prazo dele (dataFim) já passou, e não quando as visitas já foram geradas. */
export function planoEncerrado(plano: { dataFim: Date | null }, agora: Date = new Date()): boolean {
  return plano.dataFim != null && plano.dataFim < inicioDoDiaBrasilia(agora);
}
