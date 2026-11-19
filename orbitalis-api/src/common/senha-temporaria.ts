import { randomInt } from 'crypto';

// Sem caracteres que se confundem (0/O, 1/l/I): a senha é ditada ou digitada à mão
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function gerarSenhaTemporaria(tamanho = 10): string {
  let s = '';
  for (let i = 0; i < tamanho; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}
