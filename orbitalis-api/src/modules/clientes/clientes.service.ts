import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto) {
    const existe = await this.prisma.cliente.findUnique({
      where: { documento: dto.documento },
    });
    if (existe) throw new ConflictException('Documento já cadastrado');

    const senhaTemporaria = Math.random().toString(36).slice(-8);
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email: `${dto.documento}@portal.orbitalis`,
          senhaHash,
          tipo: 'cliente',
        },
      });

      const cliente = await tx.cliente.create({
        data: {
          documento: dto.documento,
          razaoSocial: dto.razaoSocial,
          nomeFantasia: dto.nomeFantasia,
          endereco: dto.endereco,
          usuarioId: usuario.id,
        },
      });

      return { cliente, senhaTemporaria };
    });
  }

  async consultarCnpj(cnpj: string) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const url = `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`;
    const res = await fetch(url);
    if (!res.ok) throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    return res.json();
  }

  findAll() {
    return this.prisma.cliente.findMany({
      where: { deletedAt: null },
      include: { ambientes: { where: { deletedAt: null } } },
    });
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete (§6.5) — UPDATE deleted_at em vez de DELETE
    return this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(id: string, data: { razaoSocial?: string; nomeFantasia?: string; endereco?: string }) {
    await this.findOne(id);
    return this.prisma.cliente.update({ where: { id }, data });
  }

  // GET /clientes/meu-perfil — retorna o perfil do cliente autenticado com seus ambientes
  async meuPerfil(usuarioId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { usuarioId, deletedAt: null },
      include: {
        ambientes: {
          where: { deletedAt: null },
          include: {
            equipamentos: { where: { deletedAt: null } },
            ordensServico: {
              orderBy: { dataAgendamento: 'desc' },
              take: 5,
              select: {
                id: true,
                status: true,
                origem: true,
                dataAgendamento: true,
                dataConclusao: true,
              },
            },
          },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Perfil de cliente não encontrado');
    return cliente;
  }
}
