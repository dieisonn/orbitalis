import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CapacidadeService } from './capacidade.service';
import { CriarAjusteDto, DefinirSemanaDto, DefinirSemanaTecnicoDto } from './dto/capacidade.dto';

@Controller('capacidade')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class CapacidadeController {
  constructor(private readonly capacidade: CapacidadeService) {}

  // GET /capacidade?de=AAAA-MM-DD&ate=AAAA-MM-DD
  @Get()
  calcular(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.capacidade.calcular(de, ate);
  }

  @Get('jornada')
  jornada() {
    return this.capacidade.jornada();
  }

  @Put('jornada/empresa')
  semanaEmpresa(@Body() dto: DefinirSemanaDto) {
    return this.capacidade.definirSemanaEmpresa(dto.semana);
  }

  @Put('jornada/tecnico/:id')
  semanaTecnico(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DefinirSemanaTecnicoDto) {
    return this.capacidade.definirSemanaTecnico(id, dto.semana);
  }

  @Post('ajustes')
  criarAjuste(@Body() dto: CriarAjusteDto) {
    return this.capacidade.criarAjuste(dto);
  }

  @Delete('ajustes/:id')
  removerAjuste(@Param('id', ParseUUIDPipe) id: string) {
    return this.capacidade.removerAjuste(id);
  }
}
