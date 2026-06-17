import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('os-export')
  @Roles(UsuarioTipo.admin)
  async exportarOs(
    @Query('de') de: string,
    @Query('ate') ate: string,
    @Query('status') status: string,
    @Query('tecnicoId') tecnicoId: string,
    @Query('clienteId') clienteId: string,
    @Query('tipo') tipo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.relatoriosService.exportarOs({ de, ate, status, tecnicoId, clienteId, tipo });
    const filename = `ordens-servico-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

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
