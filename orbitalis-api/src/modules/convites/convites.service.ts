import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { permissoesEfetivas, podeConceder, resolverAcesso } from '../../common/modulos';
import { CriarConviteDto } from './dto/criar-convite.dto';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';

@Injectable()
export class ConvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async gerar(dto: CriarConviteDto, user?: { permissoes?: string[] | null }) {
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

    let acesso: { perfilAcesso: string; permissoes: string[] } | null = null;
    if (dto.tipo === 'admin') {
      try { acesso = resolverAcesso(dto.perfilAcesso, dto.permissoes); }
      catch (e) { throw new BadRequestException((e as Error).message); }
      if (!podeConceder(user?.permissoes, acesso)) throw new ForbiddenException('Você não tem permissão para conceder esse acesso');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const convite = await this.prisma.convite.create({
      data: {
        tipo: dto.tipo,
        email: dto.email ?? null,
        clienteId: dto.clienteId ?? null,
        ...(acesso ? { perfilAcesso: acesso.perfilAcesso, permissoes: acesso.permissoes } : {}),
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
      perfilAcesso: convite.perfilAcesso,
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
      convite.tipo === 'tecnico' ? UsuarioTipo.tecnico
      : convite.tipo === 'admin' ? UsuarioTipo.admin
      : UsuarioTipo.cliente;

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
          ...(convite.tipo === 'admin' ? { perfilAcesso: convite.perfilAcesso ?? 'administrador', permissoes: convite.permissoes } : {}),
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
      permissoes: usuario.tipo === UsuarioTipo.admin ? permissoesEfetivas(usuario.perfilAcesso, usuario.permissoes) : null,
    };
  }
}
