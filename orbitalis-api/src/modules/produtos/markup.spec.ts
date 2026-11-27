import { ajustarPreco, calcularVenda } from './markup';

describe('markup', () => {
  it('aplica markup sobre o custo final', () => {
    expect(calcularVenda(100, 40)).toBe(140);
    expect(calcularVenda(33.33, 50)).toBe(50);
    expect(calcularVenda(0, 40)).toBe(0);
  });
  it('ajusta preço por percentual', () => {
    expect(ajustarPreco(200, 10)).toBe(220);
    expect(ajustarPreco(200, -25)).toBe(150);
    expect(ajustarPreco(10, -200)).toBe(0);
  });
});
