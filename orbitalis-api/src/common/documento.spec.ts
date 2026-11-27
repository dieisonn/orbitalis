import { cnpjValido, cpfValido, normalizarCpfCnpj } from './documento';

describe('documento', () => {
  it('valida CPF', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224724')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
  });
  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });
  it('normaliza e rejeita', () => {
    expect(normalizarCpfCnpj('11.222.333/0001-81', 'J')).toBe('11222333000181');
    expect(normalizarCpfCnpj('', 'J')).toBeNull();
    expect(() => normalizarCpfCnpj('123', 'F')).toThrow('CPF inválido');
    expect(() => normalizarCpfCnpj('11222333000180', 'J')).toThrow('CNPJ inválido');
  });
});
