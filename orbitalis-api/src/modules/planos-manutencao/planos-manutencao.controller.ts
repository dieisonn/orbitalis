import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePlanoManutencaoDto } from './dto/create-plano.dto';
import { PlanosManutencaoService } from './planos-manutencao.service';

@Controller('planos-manutencao')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class PlanosManutencaoController {
  constructor(private readonly planosService: PlanosManutencaoService) {}

  // POST /api/v1/planos-manutencao
  @Post()
  create(@Body() dto: CreatePlanoManutencaoDto) {
    return this.planosService.create(dto);
  }

  // GET /api/v1/planos-manutencao
  @Get()
  findAll() {
    return this.planosService.findAll();
  }

  // GET /api/v1/planos-manutencao/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planosService.findOne(id);
  }

  // PATCH /api/v1/planos-manutencao/:id/toggle-ativo
  @Patch(':id/toggle-ativo')
  toggleAtivo(@Param('id') id: string) {
    return this.planosService.toggleAtivo(id);
  }

  // POST /api/v1/planos-manutencao/disparar-agora — força execução do cron (Admin)
  @Post('disparar-agora')
  dispararAgora() {
    return this.planosService.dispararAgora();
  }
}
