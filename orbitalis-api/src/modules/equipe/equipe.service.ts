import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EquipeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembros() {
    const [membros, convitesPendentes] = await Promise.all([
      this.prisma.usuario.findMany({
        select: {
          id: true, email: true, nome: true, tipo: true,
          telefone: true, especialidade: true, dataCriacao: true,
        },
        orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
      }),
      this.prisma.convite.findMany({
        where: { usadoEm: null, expiresAt: { gt: new Date() } },
        select: {
          id: true, tipo: true, email: true, clienteId: true,
          expiresAt: true, criadoEm: true,
        },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    // Enriquecer convites de cliente com razaoSocial
    const clienteIds = convitesPendentes
      .filter((c) => c.clienteId)
      .map((c) => c.clienteId as string);

    let clienteMap: Record<string, string> = {};
    if (clienteIds.length > 0) {
      const clientes = await this.prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, razaoSocial: true },
      });
      clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.razaoSocial]));
    }

    return {
      membros,
      convitesPendentes: convitesPendentes.map((c) => ({
        ...c,
        razaoSocialCliente: c.clienteId ? (clienteMap[c.clienteId] ?? null) : null,
      })),
    };
  }

  async removerMembro(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new NotFoundException('Você não pode remover a si mesmo');
    }

    // findFirst aplica tenant filter automaticamente — garante que o membro pertence a este tenant
    const membro = await this.prisma.usuario.findFirst({
      where: { id: userId, tipo: { not: UsuarioTipo.admin } },
      select: { id: true },
    });
    if (!membro) throw new NotFoundException('Membro não encontrado ou não pode ser removido');

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { empresaId: null },
    });
  }
}
