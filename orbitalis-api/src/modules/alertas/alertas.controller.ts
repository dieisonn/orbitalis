import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get('count')
  async count() {
    const total = await this.alertasService.contarAtivos();
    return { total };
  }

  @Get()
  findAll(@Query('resolvido') resolvido?: string) {
    const r = resolvido === 'true' ? true : resolvido === 'false' ? false : undefined;
    return this.alertasService.findAll(r);
  }

  @Get('config')
  getConfig() {
    return this.alertasService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() body: any) {
    return this.alertasService.updateConfig(body);
  }

  @Patch('resolver-todos')
  resolverTodos() {
    return this.alertasService.resolverTodos();
  }

  @Patch(':id/resolver')
  resolver(@Param('id') id: string) {
    return this.alertasService.resolver(id);
  }
}
