import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  // GET /api/v1/relatorios/pmoc/:clienteId?mes=6&ano=2026 — Admin
  @Get('pmoc/:clienteId')
  @Roles(UsuarioTipo.admin)
  pmoc(
    @Param('clienteId') clienteId: string,
    @Query('mes') mes: string,
    @Query('ano') ano: string,
  ) {
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    return this.relatoriosService.pmoc(
      clienteId,
      mes ? parseInt(mes) : mesAtual,
      ano ? parseInt(ano) : anoAtual,
    );
  }
}
