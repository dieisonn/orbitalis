// Reconhece coordenadas digitadas no campo de endereço (fazendas, obras, locais sem rua):
//  • graus/minutos/segundos: 19°08'38.9"S 46°01'39.6"W  (também 19 08 38.9 S, com N/S/L/E/O/W)
//  • decimal: -19.1441, -46.0277   (vírgula decimal também vale)
export type Coordenadas = { lat: number; lon: number }

const DMS = /(\d{1,3})\s*[°º]\s*(?:(\d{1,2})\s*['′’]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:["″”]|'')\s*)?([NSLEOW])?/gi

function dmsParaDecimal(g: string, m?: string, s?: string, hemi?: string): number {
  let v = Number(g) + (m ? Number(m) / 60 : 0) + (s ? Number(s.replace(',', '.')) / 3600 : 0)
  if (hemi && /^[SOW]$/i.test(hemi)) v = -v
  return v
}

export function lerCoordenadas(texto: string): Coordenadas | null {
  const t = texto.trim()
  if (!t) return null

  // graus com símbolo: duas ocorrências (latitude e longitude)
  const achados = [...t.matchAll(DMS)]
  if (achados.length === 2) {
    const [a, b] = achados.map((m) => ({ v: dmsParaDecimal(m[1], m[2], m[3], m[4]), h: (m[4] ?? '').toUpperCase() }))
    // se vier "W/L" primeiro, é longitude primeiro
    const [lat, lon] = /^[LEOW]$/.test(a.h) && /^[NS]$/.test(b.h) ? [b.v, a.v] : [a.v, b.v]
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }
  }

  // decimal: "-19.1441, -46.0277" ou "-19.1441 -46.0277" ou "19.1441S 46.0277W"
  const dec = t.match(/^\(?\s*([+-]?\d{1,3}(?:[.,]\d+)?)\s*([NSLEOW])?\s*[,;\s]\s*([+-]?\d{1,3}(?:[.,]\d+)?)\s*([NSLEOW])?\s*\)?$/i)
  if (dec) {
    const n = (x: string, h?: string) => { const v = Number(x.replace(',', '.')); return h && /^[SOW]$/i.test(h) ? -Math.abs(v) : v }
    const lat = n(dec[1], dec[2]); const lon = n(dec[3], dec[4])
    // exige casas decimais ou hemisfério, para não confundir com "Rua X 12 34"
    const temDecimal = /[.,]\d/.test(dec[1]) && /[.,]\d/.test(dec[3])
    if ((temDecimal || (dec[2] && dec[4])) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }
  }
  return null
}

export const coordenadasTexto = (c: Coordenadas) => `${c.lat.toFixed(6)},${c.lon.toFixed(6)}`
