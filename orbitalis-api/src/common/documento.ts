// CPF/CNPJ: só dígitos, com validação dos dígitos verificadores (também base para a NFS-e)
export const apenasDigitos = (v?: string | null): string => (v ?? '').replace(/\D/g, '');

export function cpfValido(v?: string | null): boolean {
  const d = apenasDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

export function cnpjValido(v?: string | null): boolean {
  const d = apenasDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((s, c, i) => s + Number(c) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

/** Normaliza (só dígitos) e valida conforme o tipo de pessoa; devolve null se vazio, ou lança Error com a mensagem. */
export function normalizarCpfCnpj(v: string | null | undefined, tipoPessoa: 'F' | 'J'): string | null {
  const d = apenasDigitos(v);
  if (!d) return null;
  if (tipoPessoa === 'F') {
    if (!cpfValido(d)) throw new Error('CPF inválido');
  } else if (!cnpjValido(d)) throw new Error('CNPJ inválido');
  return d;
}
