import { calcularTotais, gerarParcelas } from './orcamento-totais';

describe('calcularTotais', () => {
  const itens = [{ quantidade: 2, precoUnitario: 100 }, { quantidade: 1.5, precoUnitario: 33.33 }];
  it('soma itens (2×100 + 1,5×33,33 = 249,995 → 250,00)', () => {
    expect(calcularTotais(itens).subtotal).toBe(250);
  });
  it('desconto em valor e frete', () => {
    const t = calcularTotais(itens, 'valor', 50, 20);
    expect(t).toEqual({ subtotal: 250, descontoValor: 50, frete: 20, total: 220 });
  });
  it('desconto percentual', () => {
    expect(calcularTotais(itens, 'percentual', 10).total).toBe(225);
  });
  it('desconto maior que o subtotal zera os itens, nunca fica negativo', () => {
    expect(calcularTotais(itens, 'valor', 9999, 15).total).toBe(15);
    expect(calcularTotais(itens, 'percentual', 500).descontoValor).toBe(250);
  });
  it('valores inválidos viram zero', () => {
    expect(calcularTotais(itens, 'valor', -5, 'abc').total).toBe(250);
  });
});

describe('gerarParcelas', () => {
  it('divide igualmente e joga os centavos na última', () => {
    const p = gerarParcelas(100, 3, '2026-12-10');
    expect(p.map((x) => x.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(p.reduce((t, x) => t + x.valor, 0)).toBeCloseTo(100, 2);
  });
  it('vencimentos a cada 30 dias a partir do primeiro', () => {
    expect(gerarParcelas(90, 3, '2026-12-10').map((x) => x.vencimento)).toEqual(['2026-12-10', '2027-01-09', '2027-02-08']);
  });
  it('limita entre 1 e 60 parcelas', () => {
    expect(gerarParcelas(10, 0, '2026-12-10')).toHaveLength(1);
    expect(gerarParcelas(10, 999, '2026-12-10')).toHaveLength(60);
  });
});
