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

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        senhaHash,
        tipo,
        nome: dto.nome,
        empresaId: convite.empresaId,
      },
    });

    if (convite.tipo === 'cliente' && convite.clienteId) {
      await this.prisma.cliente.update({
        where: { id: convite.clienteId },
        data: { usuarioId: usuario.id },
      });
    }

    await this.prisma.convite.update({
      where: { id: convite.id },
      data: { usadoEm: new Date() },
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
