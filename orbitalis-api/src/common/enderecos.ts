import { randomUUID } from 'crypto';

// Endereços adicionais do cliente (Casa, Loja, Trabalho…). O endereço principal continua em `clientes.endereco`.
export type EnderecoExtra = { id: string; rotulo: string; endereco: string };

/** Limpa e valida a lista vinda da tela: ignora linhas vazias, limita tamanhos e garante um id estável. */
export function normalizarEnderecos(v: unknown): EnderecoExtra[] {
  if (!Array.isArray(v)) return [];
  const out: EnderecoExtra[] = [];
  for (const x of v.slice(0, 10)) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const endereco = String(o.endereco ?? '').trim().slice(0, 500);
    if (!endereco) continue;
    const rotulo = String(o.rotulo ?? '').trim().slice(0, 40) || 'Outro';
    const id = typeof o.id === 'string' && /^[0-9a-f-]{36}$/i.test(o.id) ? o.id : randomUUID();
    out.push({ id, rotulo, endereco });
  }
  return out;
}

export function lerEnderecos(v: unknown): EnderecoExtra[] {
  return Array.isArray(v) ? (v as EnderecoExtra[]).filter((e) => e && e.id && e.endereco) : [];
}

/** Endereço onde a O.S. será feita: o escolhido (se ainda existir no cliente) ou o principal. */
export function enderecoDaOs(
  cliente: { endereco: string; enderecosExtras?: unknown },
  enderecoId?: string | null,
): { id: string | null; rotulo: string | null; endereco: string } {
  const achado = enderecoId ? lerEnderecos(cliente.enderecosExtras).find((e) => e.id === enderecoId) : undefined;
  return achado ? { id: achado.id, rotulo: achado.rotulo, endereco: achado.endereco } : { id: null, rotulo: null, endereco: cliente.endereco };
}
