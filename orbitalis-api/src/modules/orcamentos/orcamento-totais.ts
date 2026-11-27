// Contas do orçamento (centavos arredondados): total = itens − desconto + frete/outras despesas
type Numerico = number | string | { toString(): string }; // inclui Decimal do Prisma
export type ItemConta = { quantidade: Numerico; precoUnitario: Numerico };
export type DescontoTipo = 'valor' | 'percentual';

const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcularTotais(
  itens: ItemConta[],
  descontoTipo: DescontoTipo | string = 'valor',
  desconto: Numerico = 0,
  frete: Numerico = 0,
) {
  const subtotal = centavos(itens.reduce((t, i) => t + Number(i.quantidade) * Number(i.precoUnitario), 0));
  const d = Math.max(0, Number(desconto) || 0);
  // desconto nunca passa do subtotal (total não fica negativo por causa dele)
  const descontoValor = centavos(Math.min(subtotal, descontoTipo === 'percentual' ? (subtotal * Math.min(d, 100)) / 100 : d));
  const f = Math.max(0, Number(frete) || 0);
  return { subtotal, descontoValor, frete: centavos(f), total: centavos(subtotal - descontoValor + f) };
}

/**
 * Divide o total em N parcelas iguais; a diferença de centavos vai na última (a soma sempre bate com o total).
 * Vencimentos: 1º informado, depois a cada `intervaloDias`.
 */
export function gerarParcelas(total: number, quantidade: number, primeiroVencimento: string, intervaloDias = 30) {
  const n = Math.max(1, Math.min(60, Math.floor(quantidade) || 1));
  const base = Math.floor((total / n) * 100) / 100;
  const inicio = new Date(`${primeiroVencimento}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const venc = new Date(inicio.getTime() + i * intervaloDias * 86_400_000);
    const valor = i === n - 1 ? centavos(total - base * (n - 1)) : base;
    return { numero: i + 1, vencimento: venc.toISOString().slice(0, 10), valor };
  });
}
