import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AgendaService } from './agenda.service';
import { CreateEventoDto, UpdateEventoDto } from './dto/evento.dto';

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  // Admin vê tudo; técnico vê só os próprios eventos
  @Get()
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.agenda.listar(user, { inicio, fim, tecnicoId, clienteId });
  }

  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.agenda.buscar(id, user);
  }

  @Post()
  @Roles(UsuarioTipo.admin)
  criar(@Body() dto: CreateEventoDto) {
    return this.agenda.criar(dto);
  }

  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventoDto) {
    return this.agenda.atualizar(id, dto);
  }

  @Post(':id/restaurar')
  @Roles(UsuarioTipo.admin)
  restaurar(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.restaurar(id);
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.remover(id);
  }
}
