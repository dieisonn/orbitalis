import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { RelatoriosAnaliticosService } from './relatorios-analiticos.service';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(
    private readonly relatoriosService: RelatoriosService,
    private readonly analiticos: RelatoriosAnaliticosService,
  ) {}

  // Relatórios analíticos (tela + exportação): período padrão = últimos 90 dias
  @Get('contratos')
  @Roles(UsuarioTipo.admin)
  @Modulo('relatorios')
  contratos(@Query('de') de?: string, @Query('ate') ate?: string, @Query('clienteId') clienteId?: string) {
    return this.analiticos.contratos(de, ate, clienteId || undefined);
  }

  @Get('produtividade')
  @Roles(UsuarioTipo.admin)
  @Modulo('relatorios')
  produtividade(@Query('de') de?: string, @Query('ate') ate?: string, @Query('tecnicoId') tecnicoId?: string) {
    return this.analiticos.produtividade(de, ate, tecnicoId || undefined);
  }

  @Get('equipamentos')
  @Roles(UsuarioTipo.admin)
  @Modulo('relatorios')
  equipamentos(@Query('de') de?: string, @Query('ate') ate?: string, @Query('clienteId') clienteId?: string) {
    return this.analiticos.equipamentos(de, ate, clienteId || undefined);
  }

  // Valores financeiros: exige o módulo Financeiro
  @Get('financeiro')
  @Roles(UsuarioTipo.admin)
  @Modulo('financeiro')
  financeiro(@Query('de') de?: string, @Query('ate') ate?: string, @Query('clienteId') clienteId?: string) {
    return this.analiticos.financeiro(de, ate, clienteId || undefined);
  }

  @Get('os-export')
  @Roles(UsuarioTipo.admin)
  @Modulo('relatorios')
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
  @Modulo('relatorios', 'planos')
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
