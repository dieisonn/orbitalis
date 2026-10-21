// Escolhe texto preto ou branco, o que tiver mais contraste sobre a cor de fundo (hex),
// para que cores escolhidas pelo usuário (tipos de serviço, eventos) continuem legíveis.
function luminancia(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0
  const n = parseInt(m[1], 16)
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

export function textoSobre(fundoHex: string): '#ffffff' | '#111111' {
  const l = luminancia(fundoHex)
  const comBranco = 1.05 / (l + 0.05)
  const comPreto = (l + 0.05) / 0.0612 // luminância de #111 ≈ 0.0056
  return comBranco >= comPreto || comBranco >= 4.5 ? '#ffffff' : '#111111'
}
