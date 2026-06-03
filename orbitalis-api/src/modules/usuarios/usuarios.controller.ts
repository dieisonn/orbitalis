import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/v1/usuarios/tecnicos — lista técnicos para dropdown de triagem
  @Get('tecnicos')
  @Roles(UsuarioTipo.admin)
  findTecnicos() {
    return this.prisma.usuario.findMany({
      where: { tipo: 'tecnico' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}
