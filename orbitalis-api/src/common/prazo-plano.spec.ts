import { planoEncerrado, inicioDoDiaBrasilia } from './prazo-plano';

describe('planoEncerrado', () => {
  const agora = new Date('2026-11-17T15:00:00Z'); // 12h em Brasília
  it('plano com prazo no futuro ou hoje segue ativo, mesmo com todas as visitas geradas', () => {
    expect(planoEncerrado({ dataFim: new Date('2027-04-14T00:00:00Z') }, agora)).toBe(false);
    expect(planoEncerrado({ dataFim: new Date('2026-11-17T00:00:00Z') }, agora)).toBe(false);
  });
  it('só encerra depois que o prazo passou', () => {
    expect(planoEncerrado({ dataFim: new Date('2026-11-16T00:00:00Z') }, agora)).toBe(true);
  });
  it('plano sem prazo nunca é encerrado por data', () => {
    expect(planoEncerrado({ dataFim: null }, agora)).toBe(false);
  });
  it('usa o dia de Brasília (01h UTC ainda é o dia anterior)', () => {
    expect(inicioDoDiaBrasilia(new Date('2026-11-17T01:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });
});
