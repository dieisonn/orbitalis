import { chaveCabecalho, dataHoraBr, formatarNumeroBr, lerNumeroBr, lerSimNao, lerPlanilha, montarPlanilha } from './planilha';

describe('planilha', () => {
  it('lê números no formato brasileiro', () => {
    expect(lerNumeroBr('9.999,00')).toBe(9999);
    expect(lerNumeroBr('120,5')).toBe(120.5);
    expect(lerNumeroBr('R$ 1.234,56')).toBe(1234.56);
    expect(lerNumeroBr('10')).toBe(10);
    expect(lerNumeroBr('3.5')).toBe(3.5);
    expect(lerNumeroBr(7)).toBe(7);
    expect(lerNumeroBr('')).toBeUndefined();
    expect(lerNumeroBr('abc')).toBeNaN();
  });
  it('formata como a planilha de origem', () => {
    expect(formatarNumeroBr(9999)).toBe('9.999,00');
    expect(formatarNumeroBr('0')).toBe('0,00');
    expect(formatarNumeroBr(1.5, 3)).toBe('1,500');
  });
  it('sim/não', () => {
    expect(lerSimNao('Sim')).toBe(true);
    expect(lerSimNao('Não')).toBe(false);
    expect(lerSimNao('')).toBeUndefined();
  });
  it('cabeçalho normalizado', () => {
    expect(chaveCabecalho('Nome do serviço *')).toBe('nome do servico');
    expect(chaveCabecalho('Comissão (%)')).toBe('comissao (%)');
  });
  it('data como na origem', () => {
    expect(dataHoraBr(new Date('2026-03-30T14:34:10Z'))).toBe('30/03/2026 11:34:10');
  });
  it('vai e volta pela planilha', async () => {
    const buf = await montarPlanilha('Worksheet', ['Código', 'Nome do serviço *', 'Valor de custo'], [['001', 'Limpeza', '9.999,00']]);
    const lido = await lerPlanilha(buf.toString('base64'));
    expect(lido.linhas).toHaveLength(1);
    expect(lido.linhas[0].valores).toEqual({ codigo: '001', 'nome do servico': 'Limpeza', 'valor de custo': '9.999,00' });
  });
});
