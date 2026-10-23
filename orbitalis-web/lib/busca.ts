// Busca sem diferenciar acento nem maiúscula: "joao" encontra "João"
export const semAcento = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const contem = (texto: string | null | undefined, termo: string) => semAcento(texto).includes(semAcento(termo))

export const compararNomes = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
