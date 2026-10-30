import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AgendaService } from './agenda.service';
import { CreateEventoDto, CriarSerieDto, UpdateEventoDto } from './dto/evento.dto';
import { Escopo, parseEscopo } from './agenda-escopo';
import { AvisosAgendaDto } from './dto/avisos.dto';

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

  // Contagem de atendimentos por tipo (VT, MP, PM, RT...), técnico e mês — antes de ':id'
  @Get('relatorio')
  @Roles(UsuarioTipo.admin)
  relatorio(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.agenda.relatorio({ inicio, fim, tecnicoId, clienteId });
  }

  // Avisos de eventos próximos (minutos de antecedência) de quem está logado — antes de ':id'
  @Get('avisos')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  avisos(@CurrentUser() user: AuthUser) {
    return this.agenda.avisos(user.id);
  }

  @Put('avisos')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  salvarAvisos(@CurrentUser() user: AuthUser, @Body() dto: AvisosAgendaDto) {
    return this.agenda.salvarAvisos(user.id, dto.minutos);
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

  // Evento repetido: cria todas as ocorrências de uma vez, ligadas pela mesma série — antes de ':id'
  @Post('serie')
  @Roles(UsuarioTipo.admin)
  criarSerie(@Body() dto: CriarSerieDto) {
    return this.agenda.criarSerie(dto);
  }

  // escopo: este (padrão) | seguintes | todos — vale para eventos de uma série
  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventoDto, @Query('escopo') escopo?: string) {
    return this.agenda.atualizar(id, dto, parseEscopo(escopo));
  }

  @Post(':id/restaurar')
  @Roles(UsuarioTipo.admin)
  restaurar(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.restaurar(id);
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remover(@Param('id', ParseUUIDPipe) id: string, @Query('escopo') escopo?: string) {
    return this.agenda.remover(id, parseEscopo(escopo));
  }
}
