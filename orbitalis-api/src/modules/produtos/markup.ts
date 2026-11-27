/** Preço de venda = custo final × (1 + markup/100), arredondado a centavos. */
export const arred2 = (x: number) => Math.round(x * 100) / 100;
export const calcularVenda = (custoFinal: number, markupPct: number) => arred2(custoFinal * (1 + markupPct / 100));
/** Ajuste percentual sobre um preço (+10 sobe 10%, -5 reduz 5%); nunca fica negativo. */
export const ajustarPreco = (preco: number, pct: number) => Math.max(0, arred2(preco * (1 + pct / 100)));
