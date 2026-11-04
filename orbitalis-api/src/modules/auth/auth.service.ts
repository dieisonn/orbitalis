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
import { permissoesEfetivas } from '../../common/modulos';
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
    // O mesmo e-mail pode existir em empresas diferentes: busca todas as contas com esse e-mail (sem tenant filter)
    // e fica com as que batem com a senha informada.
    const email = dto.email.trim().toLowerCase();
    const candidatos = await this.prisma.$queryRaw<
      { id: string; email: string; senhaHash: string; tipo: UsuarioTipo; empresaId: string | null; perfilAcesso: string | null; permissoes: string[] }[]
    >`SELECT id, email, senha_hash AS "senhaHash", tipo, empresa_id AS "empresaId", perfil_acesso AS "perfilAcesso", permissoes
      FROM usuarios WHERE lower(email) = ${email} AND empresa_id IS NOT NULL`;

    if (candidatos.length === 0) throw new UnauthorizedException('Credenciais inválidas');

    const validos: typeof candidatos = [];
    for (const c of candidatos) {
      if (await bcrypt.compare(dto.senha, c.senhaHash)) validos.push(c);
    }
    if (validos.length === 0) {
      await this.registrarAcesso(candidatos[0], 'login_falha', 'Tentativa de login com senha incorreta');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let usuario = validos[0];
    if (dto.empresaId) {
      const escolhido = validos.find((v) => v.empresaId === dto.empresaId);
      if (!escolhido) throw new UnauthorizedException('Credenciais inválidas');
      usuario = escolhido;
    } else if (validos.length > 1) {
      const empresas = await this.prisma.empresa.findMany({
        where: { id: { in: validos.map((v) => v.empresaId as string) } },
        select: { id: true, nomeEmpresa: true, nomeFantasia: true },
      });
      throw new ConflictException({
        message: 'Este e-mail tem acesso a mais de uma empresa. Escolha qual deseja acessar.',
        empresas: empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia || e.nomeEmpresa })),
      });
    }

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

    await this.registrarAcesso(usuario, 'login', 'Entrou no sistema');

    return {
      access_token: this.jwt.sign(payload),
      role: usuario.tipo,
      permissoes: usuario.tipo === UsuarioTipo.admin ? permissoesEfetivas(usuario.perfilAcesso, usuario.permissoes) : null,
    };
  }

  // Registro de atividades: entradas no sistema e tentativas de login com senha errada
  private async registrarAcesso(u: { id: string; email: string; tipo: UsuarioTipo; empresaId: string | null }, acao: string, descricao: string) {
    try {
      const nome = await this.prisma.usuario.findUnique({ where: { id: u.id }, select: { nome: true } });
      await this.prisma.logAuditoria.create({
        data: { empresaId: u.empresaId, usuarioId: u.id, usuarioNome: nome?.nome ?? null, usuarioEmail: u.email, usuarioTipo: u.tipo, acao, descricao, rota: '/auth/login', metodo: 'POST', entidade: 'auth' },
      });
    } catch { /* o registro nunca impede o login */ }
  }

  async registrar(dto: RegistrarDto) {
    // Verifica unicidade de slug (sem tenant filter — busca global)
    const slugExiste = await this.prisma.empresa.findUnique({
      where: { slug: dto.slug },
    });
    if (slugExiste) throw new ConflictException('Slug já está em uso');

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
        await this.checklists.seedInstalacaoNova();
        await this.checklists.seedVisitaTecnica();
      });
    } catch (e) {
      // Não bloqueia o cadastro; o admin pode importar os padrões depois
      console.error('Falha ao semear padrões da empresa', empresaId, e);
    }
  }
}
