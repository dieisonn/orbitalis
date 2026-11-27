import { calcularMovimento } from './calculo-estoque';

describe('calcularMovimento', () => {
  it('entrada soma', () => expect(calcularMovimento('entrada', 5, 3)).toEqual({ delta: 3, saldoApos: 8 }));
  it('saída subtrai', () => expect(calcularMovimento('saida', 5, 2)).toEqual({ delta: -2, saldoApos: 3 }));
  it('saída não deixa negativo', () => expect(() => calcularMovimento('saida', 1, 2)).toThrow('Saldo insuficiente'));
  it('saída livre se não controla estoque', () => expect(calcularMovimento('saida', 0, 2, false)).toEqual({ delta: -2, saldoApos: -2 }));
  it('ajuste usa o saldo contado', () => {
    expect(calcularMovimento('ajuste', 10, 7)).toEqual({ delta: -3, saldoApos: 7 });
    expect(calcularMovimento('ajuste', 2, 5.5)).toEqual({ delta: 3.5, saldoApos: 5.5 });
  });
  it('rejeita quantidade inválida', () => {
    expect(() => calcularMovimento('entrada', 1, 0)).toThrow();
    expect(() => calcularMovimento('ajuste', 1, -1)).toThrow();
    expect(() => calcularMovimento('entrada', 1, NaN)).toThrow();
  });
  it('evita erro de ponto flutuante', () => expect(calcularMovimento('entrada', 0.1, 0.2).saldoApos).toBe(0.3));
});
