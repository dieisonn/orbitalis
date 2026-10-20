import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarConviteDto } from './dto/criar-convite.dto';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';

@Injectable()
export class ConvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async gerar(dto: CriarConviteDto) {
    if (dto.tipo === 'cliente') {
      if (!dto.clienteId) throw new BadRequestException('Informe o cliente que receberá o convite');
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, deletedAt: null },
        select: { id: true, usuarioId: true },
      });
      if (!cliente) throw new NotFoundException('Cliente não encontrado');
      if (cliente.usuarioId)
        throw new ConflictException('Este cliente já possui acesso ao portal');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const convite = await this.prisma.convite.create({
      data: {
        tipo: dto.tipo,
        email: dto.email ?? null,
        clienteId: dto.clienteId ?? null,
        expiresAt,
      },
    });

    return { token: convite.token };
  }

  async buscarPorToken(token: string) {
    const convite = await this.prisma.convite.findUnique({ where: { token } });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    if (convite.usadoEm) throw new BadRequestException('Convite já utilizado');
    if (convite.expiresAt < new Date()) throw new BadRequestException('Convite expirado');

    const empresa = convite.empresaId
      ? await this.prisma.empresa.findUnique({ where: { id: convite.empresaId } })
      : null;

    let razaoSocialCliente: string | null = null;
    if (convite.tipo === 'cliente' && convite.clienteId) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: convite.clienteId },
      });
      razaoSocialCliente = cliente?.razaoSocial ?? null;
    }

    return {
      tipo: convite.tipo,
      email: convite.email,
      nomeEmpresa: empresa?.nomeEmpresa ?? null,
      razaoSocialCliente,
    };
  }

  async revogar(id: string) {
    const convite = await this.prisma.convite.findFirst({
      where: { id, usadoEm: null },
      select: { id: true },
    });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    // deleteMany aplica tenant filter automaticamente
    await this.prisma.convite.deleteMany({ where: { id } });
  }

  async aceitar(token: string, dto: AceitarConviteDto) {
    const convite = await this.prisma.convite.findUnique({ where: { token } });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    if (convite.usadoEm) throw new BadRequestException('Convite já utilizado');
    if (convite.expiresAt < new Date()) throw new BadRequestException('Convite expirado');

    const email = dto.email ?? convite.email;
    if (!email) throw new BadRequestException('E-mail é obrigatório');

    const existe = await this.prisma.usuario.findUnique({ where: { email } });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const tipo =
      convite.tipo === 'tecnico' ? UsuarioTipo.tecnico : UsuarioTipo.cliente;

    // Tudo ou nada: usuário, vínculo com o cliente e baixa do convite
    const usuario = await this.prisma.$transaction(async (tx) => {
      // Consome o convite de forma atômica (dois cliques simultâneos não criam dois usuários)
      const { count } = await tx.convite.updateMany({
        where: { id: convite.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      if (count === 0) throw new BadRequestException('Convite já utilizado');

      if (convite.tipo === 'cliente') {
        if (!convite.clienteId)
          throw new BadRequestException('Convite de cliente sem cliente vinculado');
        const cliente = await tx.cliente.findFirst({
          where: { id: convite.clienteId, deletedAt: null },
          select: { usuarioId: true },
        });
        if (!cliente) throw new NotFoundException('Cliente não encontrado');
        if (cliente.usuarioId)
          throw new ConflictException('Este cliente já possui acesso ao portal');
      }

      const novo = await tx.usuario.create({
        data: {
          email,
          senhaHash,
          tipo,
          nome: dto.nome,
          empresaId: convite.empresaId,
        },
      });

      if (convite.tipo === 'cliente' && convite.clienteId) {
        await tx.cliente.update({
          where: { id: convite.clienteId },
          data: { usuarioId: novo.id },
        });
      }

      return novo;
    });

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.tipo,
      empresaId: convite.empresaId ?? undefined,
    };

    return {
      access_token: this.jwt.sign(payload),
      role: usuario.tipo,
    };
  }
}
