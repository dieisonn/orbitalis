import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BuscaService } from './busca.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('busca')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class BuscaController {
  constructor(private readonly buscaService: BuscaService) {}

  @Get()
  buscar(@Query('q') q: string) {
    return this.buscaService.buscar(q ?? '');
  }
}
