import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ConfiguracaoEmpresaService } from './configuracao-empresa.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('configuracao')
export class ConfiguracaoEmpresaController {
  constructor(private readonly service: ConfiguracaoEmpresaService) {}

  // GET /configuracao — público (sem guard) para login page e sidebar
  @Get()
  get() {
    return this.service.get();
  }

  // PATCH /configuracao — somente admin
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  upsert(@Body() body: { nomeEmpresa?: string; nomeFantasia?: string; logoUrl?: string; corPrimaria?: string }) {
    return this.service.upsert(body);
  }
}
