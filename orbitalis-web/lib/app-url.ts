// URL pública do app. Usada nos QR Codes das etiquetas dos equipamentos.
// Padrão: domínio próprio (estável). Pode ser sobrescrita por NEXT_PUBLIC_APP_URL.
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.orbitalis.com.br').replace(/\/$/, '')
