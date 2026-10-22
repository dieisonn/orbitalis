import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { runWithTenant } from '../../common/tenant.context';
import { TIPOS_SERVICO_PADRAO } from '../../common/tipos-servico-padrao';
import { ModelosChecklistService } from '../modelos-checklist/modelos-checklist.service';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly checklists: ModelosChecklistService,
  ) {}

  async login(dto: LoginDto) {
    // findUnique não passa pelo tenant filter — busca em todos os tenants
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        senhaHash: true,
        tipo: true,
        empresaId: true,
      },
    });

    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    // Cliente excluído (soft delete) perde o acesso ao portal
    if (usuario.tipo === UsuarioTipo.cliente) {
      const ativo = await this.prisma.cliente.findFirst({
        where: { usuarioId: usuario.id, deletedAt: null },
        select: { id: true },
      });
      if (!ativo) throw new UnauthorizedException('Acesso desativado. Fale com a empresa de manutenção.');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.tipo,
      empresaId: usuario.empresaId ?? undefined,
    };

    return {
      access_token: this.jwt.sign(payload),
      role: usuario.tipo,
    };
  }

  async registrar(dto: RegistrarDto) {
    // Verifica unicidade de slug (sem tenant filter — busca global)
    const slugExiste = await this.prisma.empresa.findUnique({
      where: { slug: dto.slug },
    });
    if (slugExiste) throw new ConflictException('Slug já está em uso');

    // Verifica unicidade de e-mail (sem tenant filter)
    const emailExiste = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (emailExiste) throw new ConflictException('E-mail já cadastrado');

    // Cria empresa
    const empresa = await this.prisma.empresa.create({
      data: {
        slug: dto.slug,
        nomeEmpresa: dto.nomeEmpresa,
        plano: 'basico',
      },
    });

    // Cria admin da empresa
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        senhaHash,
        tipo: UsuarioTipo.admin,
        nome: dto.nomeAdmin,
        empresaId: empresa.id,
      },
    });

    // Catálogo inicial da empresa: tipos de serviço e checklists padrão (PMOC, ANVISA, limpeza química e corretiva)
    await this.semearPadroes(empresa.id);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.tipo,
      empresaId: empresa.id,
    };

    return {
      access_token: this.jwt.sign(payload),
      role: usuario.tipo,
      empresa: { id: empresa.id, slug: empresa.slug, nomeEmpresa: empresa.nomeEmpresa },
    };
  }

  private async semearPadroes(empresaId: string) {
    try {
      await this.prisma.tipoServico.createMany({
        data: TIPOS_SERVICO_PADRAO.map((t) => ({ ...t, sistema: true, empresaId })),
        skipDuplicates: true,
      });
      await runWithTenant(empresaId, async () => {
        await this.checklists.seedPmocSplitHiwall();
        await this.checklists.seedAnvisa();
        await this.checklists.seedLimpezaQuimica();
        await this.checklists.seedCorretiva();
      });
    } catch (e) {
      // Não bloqueia o cadastro; o admin pode importar os padrões depois
      console.error('Falha ao semear padrões da empresa', empresaId, e);
    }
  }
}
