import { contratosSubstituidos } from './situacao-contrato';

const c = (id: string, clienteId: string, descricao: string, ini: string) => ({ id, clienteId, descricao, vigenciaInicio: new Date(ini) });

describe('contratosSubstituidos', () => {
  it('marca o contrato antigo quando há outro mais novo do mesmo cliente e nome', () => {
    const r = contratosSubstituidos([c('a', '1', 'PMOC', '2025-01-01'), c('b', '1', ' pmoc ', '2026-01-01')]);
    expect([...r]).toEqual(['a']);
  });
  it('não mistura clientes nem nomes diferentes', () => {
    expect(contratosSubstituidos([c('a', '1', 'PMOC', '2025-01-01'), c('b', '2', 'PMOC', '2026-01-01')]).size).toBe(0);
    expect(contratosSubstituidos([c('a', '1', 'PMOC', '2025-01-01'), c('b', '1', 'Limpeza', '2026-01-01')]).size).toBe(0);
  });
  it('em cadeia, só o último fica ativo', () => {
    const r = contratosSubstituidos([c('a', '1', 'X', '2024-01-01'), c('b', '1', 'X', '2025-01-01'), c('c', '1', 'X', '2026-01-01')]);
    expect([...r].sort()).toEqual(['a', 'b']);
  });
});
