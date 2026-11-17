import { PrismaService } from '../../prisma/prisma.service';

type ContratoBase = { id: string; clienteId: string; descricao: string; vigenciaInicio: Date };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Contratos que já foram substituídos por outro mais novo do mesmo cliente com o mesmo nome
 * (renovação feita pelo botão "Renovar" ou criando o contrato novo à mão). Esses não contam como ativos.
 */
export function contratosSubstituidos(todos: ContratoBase[]): Set<string> {
  const r = new Set<string>();
  for (const c of todos) {
    const nome = norm(c.descricao);
    if (todos.some((d) => d.id !== c.id && d.clienteId === c.clienteId && norm(d.descricao) === nome && d.vigenciaInicio > c.vigenciaInicio)) r.add(c.id);
  }
  return r;
}

/** Busca os contratos dos mesmos clientes e devolve o conjunto dos que já foram substituídos. */
export async function idsSubstituidos(prisma: PrismaService, contratos: { clienteId: string }[]): Promise<Set<string>> {
  const clienteIds = [...new Set(contratos.map((c) => c.clienteId))];
  if (!clienteIds.length) return new Set();
  const todos = await prisma.contrato.findMany({
    where: { clienteId: { in: clienteIds } },
    select: { id: true, clienteId: true, descricao: true, vigenciaInicio: true },
  });
  return contratosSubstituidos(todos);
}
