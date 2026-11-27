import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConcluirInventarioDto, ContagemDto, CreateInventarioDto } from './dto/inventario.dto';
import { InventariosService } from './inventarios.service';

@Controller('inventarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class InventariosController {
  constructor(private readonly svc: InventariosService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.buscar(id);
  }

  @Post()
  criar(@Body() dto: CreateInventarioDto, @CurrentUser() user: AuthUser) {
    return this.svc.criar(dto, user.id);
  }

  @Put(':id/contagem')
  contar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ContagemDto, @CurrentUser() user: AuthUser) {
    return this.svc.contar(id, dto, user.id);
  }

  @Post(':id/concluir')
  concluir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConcluirInventarioDto, @CurrentUser() user: AuthUser) {
    return this.svc.concluir(id, dto, user.id);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.cancelar(id);
  }
}
