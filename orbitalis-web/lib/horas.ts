// Formata minutos como "8h30" (módulo sem 'use client': serve ao servidor e ao navegador)
export const fmtHoras = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
