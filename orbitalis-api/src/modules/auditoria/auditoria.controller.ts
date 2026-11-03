import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// Registro de atividades: só administrador com acesso total
@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class AuditoriaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar(
    @CurrentUser() user: AuthUser,
    @Query('usuarioId') usuarioId?: string,
    @Query('entidade') entidade?: string,
    @Query('acao') acao?: string,
    @Query('entidadeId') entidadeId?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    if (Array.isArray(user.permissoes)) throw new ForbiddenException('Apenas administradores com acesso total veem o registro de atividades');
    const p = Math.max(1, Number(page) || 1);
    const pp = Math.min(100, Math.max(1, Number(perPage) || 50));

    // datas em horário de Brasília (UTC-3)
    const inicio = de && /^\d{4}-\d{2}-\d{2}$/.test(de) ? new Date(`${de}T00:00:00-03:00`) : undefined;
    const fim = ate && /^\d{4}-\d{2}-\d{2}$/.test(ate) ? new Date(`${ate}T23:59:59.999-03:00`) : undefined;

    const where = {
      ...(usuarioId ? { usuarioId } : {}),
      ...(entidade ? { entidade } : {}),
      ...(entidadeId ? { entidadeId } : {}),
      ...(acao ? { acao } : {}),
      ...(inicio || fim ? { criadoEm: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {}),
      ...(q ? { OR: [{ descricao: { contains: q, mode: 'insensitive' as const } }, { usuarioNome: { contains: q, mode: 'insensitive' as const } }, { usuarioEmail: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.logAuditoria.findMany({ where, orderBy: { criadoEm: 'desc' }, skip: (p - 1) * pp, take: pp }),
      this.prisma.logAuditoria.count({ where }),
    ]);
    return { data, total, page: p, perPage: pp };
  }
}
