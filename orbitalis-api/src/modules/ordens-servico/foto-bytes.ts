export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
export const FOTOS_MAX_POR_OS = 80;
export const OS_ENCERRADA: string[] = ['concluida', 'cancelada'];

/** Confere se os primeiros bytes são mesmo de uma imagem do tipo declarado (não confia no texto enviado). */
export function bytesDeImagemValidos(b: Buffer, mime: string): boolean {
  if (b.length < 12) return false;
  if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/png') return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/webp') return b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
  return false;
}
