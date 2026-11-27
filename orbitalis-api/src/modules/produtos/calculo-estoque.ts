import { BadRequestException } from '@nestjs/common';

export type TipoMovimento = 'entrada' | 'saida' | 'ajuste';

export const MOTIVOS_POR_TIPO: Record<TipoMovimento, string[]> = {
  entrada: ['compra', 'saldo_inicial', 'devolucao', 'outro'],
  saida: ['uso_os', 'uso_orcamento', 'venda', 'perda', 'outro'],
  ajuste: ['ajuste_inventario'],
};

const arred = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Calcula a variação do saldo. entrada soma, saida subtrai (sem deixar negativo quando o produto controla estoque),
 * ajuste = contagem física: `quantidade` é o NOVO saldo.
 */
export function calcularMovimento(
  tipo: TipoMovimento,
  saldoAtual: number,
  quantidade: number,
  controlaEstoque = true,
): { delta: number; saldoApos: number } {
  if (!Number.isFinite(quantidade)) throw new BadRequestException('Quantidade inválida');
  if (tipo === 'ajuste') {
    if (quantidade < 0) throw new BadRequestException('O saldo contado não pode ser negativo');
    const saldoApos = arred(quantidade);
    return { delta: arred(saldoApos - saldoAtual), saldoApos };
  }
  if (quantidade <= 0) throw new BadRequestException('A quantidade deve ser maior que zero');
  const q = arred(quantidade);
  if (tipo === 'entrada') return { delta: q, saldoApos: arred(saldoAtual + q) };
  if (controlaEstoque && q > saldoAtual + 1e-9) {
    throw new BadRequestException(`Saldo insuficiente: há ${saldoAtual} em estoque e a saída pede ${q}`);
  }
  return { delta: -q, saldoApos: arred(saldoAtual - q) };
}
