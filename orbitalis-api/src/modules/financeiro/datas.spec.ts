import { dividirValor, somarMeses, vencimentos } from './datas';

describe('datas do financeiro', () => {
  it('soma meses mantendo o dia e respeitando fim de mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-01-31', 2)).toBe('2026-03-31');
    expect(somarMeses('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('gera vencimentos mensais, quinzenais e semanais', () => {
    expect(vencimentos('2026-11-30', 3)).toEqual(['2026-11-30', '2026-12-30', '2027-01-30']);
    expect(vencimentos('2026-11-01', 3, 'quinzenal')).toEqual(['2026-11-01', '2026-11-16', '2026-12-01']);
    expect(vencimentos('2026-11-01', 2, 'semanal')).toEqual(['2026-11-01', '2026-11-08']);
  });
  it('divide o valor e a soma sempre bate', () => {
    expect(dividirValor(100, 3)).toEqual([33.33, 33.33, 33.34]);
    for (const [t, n] of [[290, 3], [0.05, 3], [1234.56, 7]] as const) {
      expect(Math.round(dividirValor(t, n).reduce((a, b) => a + b, 0) * 100) / 100).toBe(t);
    }
  });
});
