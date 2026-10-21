import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { TipoFeriado, UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeriadosService } from './feriados.service';

@Controller('feriados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeriadosController {
  constructor(private readonly service: FeriadosService) {}

  // GET /feriados?ano=2026 — nacionais + os da empresa
  @Get()
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  listar(@Query('ano') ano?: string) {
    return this.service.listar(ano ? Number(ano) : new Date().getUTCFullYear());
  }

  @Post()
  @Roles(UsuarioTipo.admin)
  criar(@Body() body: { data: string; nome: string; tipo: TipoFeriado; recorrente?: boolean }) {
    return this.service.criar(body);
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }
}
