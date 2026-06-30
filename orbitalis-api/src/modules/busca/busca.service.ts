import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BuscaService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(termo: string) {
    if (!termo || termo.trim().length < 2) return { clientes: [], ordens: [], equipamentos: [], ambientes: [] };

    const q = termo.trim();

    const [clientes, ordens, equipamentos, ambientes] = await Promise.all([
      // Clientes por razão social, nome fantasia ou CNPJ
      this.prisma.cliente.findMany({
        where: {
          deletedAt: null,
          OR: [
            { razaoSocial: { contains: q, mode: 'insensitive' } },
            { nomeFantasia: { contains: q, mode: 'insensitive' } },
            { documento: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, razaoSocial: true, nomeFantasia: true, documento: true },
        take: 5,
      }),

      // Ordens de serviço por número ou cliente
      this.prisma.ordemServico.findMany({
        where: {
          OR: [
            ...(isNaN(Number(q)) ? [] : [{ numero: Number(q) }]),
            { ambiente: { cliente: { razaoSocial: { contains: q, mode: 'insensitive' as const } } } },
            { ambiente: { cliente: { nomeFantasia: { contains: q, mode: 'insensitive' as const } } } },
          ],
        },
        select: {
          id: true,
          numero: true,
          status: true,
          tipo: true,
          dataAgendamento: true,
          ambiente: { select: { nome: true, cliente: { select: { nomeFantasia: true, razaoSocial: true } } } },
        },
        orderBy: { dataAgendamento: 'desc' },
        take: 5,
      }),

      // Equipamentos por nome, marca, modelo, número de série ou QR
      this.prisma.equipamento.findMany({
        where: {
          deletedAt: null,
          OR: [
            { nome: { contains: q, mode: 'insensitive' } },
            { marca: { contains: q, mode: 'insensitive' } },
            { modelo: { contains: q, mode: 'insensitive' } },
            { numeroSerie: { contains: q, mode: 'insensitive' } },
            { codigoQr: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nome: true,
          marca: true,
          tipoEquipamento: true,
          ambiente: { select: { nome: true, cliente: { select: { nomeFantasia: true, razaoSocial: true } } } },
        },
        take: 5,
      }),

      // Ambientes por nome ou localização
      this.prisma.ambiente.findMany({
        where: {
          deletedAt: null,
          OR: [
            { nome: { contains: q, mode: 'insensitive' } },
            { localizacaoInterna: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nome: true,
          localizacaoInterna: true,
          cliente: { select: { nomeFantasia: true, razaoSocial: true } },
        },
        take: 5,
      }),
    ]);

    return {
      clientes: clientes.map((c) => ({
        id: c.id,
        label: c.nomeFantasia ?? c.razaoSocial,
        sublabel: c.documento,
        href: `/clientes/${c.id}`,
        tipo: 'cliente' as const,
      })),
      ordens: ordens.map((o) => ({
        id: o.id,
        label: `OS-${o.numero != null ? String(o.numero).padStart(4, '0') : o.id.slice(0, 6).toUpperCase()}`,
        sublabel: `${(o as any).ambiente?.cliente?.nomeFantasia ?? (o as any).ambiente?.cliente?.razaoSocial ?? ''} · ${o.tipo} · ${o.status}`,
        href: `/ordens-servico/${o.id}`,
        tipo: 'ordem' as const,
      })),
      equipamentos: equipamentos.map((e) => ({
        id: e.id,
        label: e.nome,
        sublabel: `${e.marca} · ${e.tipoEquipamento} · ${e.ambiente?.cliente?.nomeFantasia ?? e.ambiente?.cliente?.razaoSocial ?? ''}`,
        href: `/equipamentos/${e.id}/historico`,
        tipo: 'equipamento' as const,
      })),
      ambientes: ambientes.map((a) => ({
        id: a.id,
        label: a.nome,
        sublabel: `${a.localizacaoInterna ?? ''} · ${a.cliente?.nomeFantasia ?? a.cliente?.razaoSocial ?? ''}`,
        href: `/ambientes/${a.id}`,
        tipo: 'ambiente' as const,
      })),
    };
  }
}
