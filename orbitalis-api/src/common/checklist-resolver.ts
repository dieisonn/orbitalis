import { NotFoundException } from '@nestjs/common';
import { OsTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ChecklistCriterio = {
  /** Modelo escolhido explicitamente pelo usuário (tem prioridade sobre tudo) */
  modeloChecklistId?: string | null;
  /** Tipo da manutenção (preventiva/corretiva) */
  tipo?: OsTipo | null;
  /** Tipo de serviço (ex.: limpeza química, instalação) */
  tipoServicoId?: string | null;
};

/**
 * Descobre quais itens de checklist copiar para uma O.S.
 *
 * Ordem de escolha (do mais específico para o mais geral):
 *  1. modelo escolhido explicitamente
 *  2. modelo do mesmo tipo de serviço E do mesmo tipo (preventiva/corretiva)
 *  3. modelo do mesmo tipo de serviço (sem tipo definido)
 *  4. modelo do mesmo tipo (sem serviço definido)
 *  5. nenhum — checklist vazio (nunca usa um modelo "qualquer" de outro caso)
 *
 * Retorna sempre uma cópia (snapshot), para que editar o modelo depois
 * não altere O.S. já geradas.
 */
export async function resolverChecklistItens(
  prisma: PrismaService,
  criterio: ChecklistCriterio,
): Promise<Prisma.InputJsonValue> {
  if (criterio.modeloChecklistId) {
    const modelo = await prisma.modeloChecklist.findUnique({
      where: { id: criterio.modeloChecklistId },
    });
    if (!modelo) throw new NotFoundException('Modelo de checklist não encontrado');
    return snapshot(modelo.itens);
  }

  const { tipo = null, tipoServicoId = null } = criterio;
  if (!tipo && !tipoServicoId) return [];

  const candidatos = await prisma.modeloChecklist.findMany({
    where: {
      OR: [
        ...(tipoServicoId ? [{ tipoServicoId }] : []),
        ...(tipo ? [{ tipo, tipoServicoId: null }] : []),
      ],
    },
    orderBy: { nome: 'asc' },
  });

  const pontos = (m: { tipo: OsTipo | null; tipoServicoId: string | null }) => {
    const servicoBate = !!tipoServicoId && m.tipoServicoId === tipoServicoId;
    const tipoBate = !!tipo && m.tipo === tipo;
    if (servicoBate && tipoBate) return 4;
    if (servicoBate && m.tipo === null) return 3;
    if (!m.tipoServicoId && tipoBate) return 2;
    return 0; // serviço bate mas é de outro tipo (ex.: modelo de corretiva numa preventiva)
  };

  const melhor = candidatos
    .map((m) => ({ m, p: pontos(m) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)[0];

  return melhor ? snapshot(melhor.m.itens) : [];
}

function snapshot(itens: Prisma.JsonValue): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(itens ?? [])) as Prisma.InputJsonValue;
}
