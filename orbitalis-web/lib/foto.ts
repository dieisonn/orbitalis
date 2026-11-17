/** Reduz a foto no aparelho (lado maior 1280 px, JPEG) para caber no envio e no banco. */
export async function reduzirImagem(file: File, ladoMax = 1280, qualidade = 0.72): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não foi possível ler a foto'))
      i.src = url
    })
    const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a foto')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}
