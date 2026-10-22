// Datas das visitas de um plano preventivo — mesma regra da API (geração de O.S.):
// 30/60/90/180/365 dias andam por mês de calendário; outros valores, em dias corridos.
function mesesDoCiclo(frequenciaDias: number): number | null {
  if (frequenciaDias === 365) return 12
  if (frequenciaDias >= 30 && frequenciaDias <= 360 && frequenciaDias % 30 === 0) return frequenciaDias / 30
  return null
}

/** Data (AAAA-MM-DD) da n-ésima visita (n = 0 é a primeira) ou null se a entrada for inválida. */
export function dataDaVisita(primeira: string, frequenciaDias: number, n: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(primeira)
  if (!m || !Number.isFinite(frequenciaDias) || frequenciaDias < 1 || n < 0) return null
  const base = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  const meses = mesesDoCiclo(frequenciaDias)
  let r: Date
  if (meses !== null) {
    const dia = base.getUTCDate()
    r = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + meses * n, 1))
    const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()
    r.setUTCDate(Math.min(dia, ultimo))
  } else {
    r = new Date(base.getTime() + frequenciaDias * n * 86_400_000)
  }
  return r.toISOString().slice(0, 10)
}

export const fmtDataISO = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
