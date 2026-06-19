import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TiposServicoService } from './tipos-servico.service';

@Controller('tipos-servico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposServicoController {
  constructor(private readonly service: TiposServicoService) {}

  @Get()
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(UsuarioTipo.admin)
  create(
    @Body() body: { sigla: string; nome: string; corHex: string; calendarColorId?: string; valorPadrao?: number | null },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  update(
    @Param('id') id: string,
    @Body() body: { nome?: string; corHex?: string; calendarColorId?: string; valorPadrao?: number | null; ativo?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
