import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EquipamentosService } from './equipamentos.service';
import { CreateEquipamentoDto } from './dto/create-equipamento.dto';
import { SubstituirQrDto } from './dto/substituir-qr.dto';

@Controller('equipamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipamentosController {
  constructor(private readonly equipamentosService: EquipamentosService) {}

  // POST /api/v1/equipamentos
  @Post()
  @Roles(UsuarioTipo.admin)
  create(@Body() dto: CreateEquipamentoDto) {
    return this.equipamentosService.create(dto);
  }

  // GET /api/v1/equipamentos
  @Get()
  @Roles(UsuarioTipo.admin)
  findAll() {
    return this.equipamentosService.findAll();
  }

  // GET /api/v1/equipamentos/:id
  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findOne(@Param('id') id: string) {
    return this.equipamentosService.findOne(id);
  }

  // GET /api/v1/equipamentos/qr/:codigo — Técnico ou Admin escaneia QR Code (§US09)
  @Get('qr/:codigo')
  @Roles(UsuarioTipo.tecnico, UsuarioTipo.admin)
  findByQr(@Param('codigo') codigo: string) {
    return this.equipamentosService.findByQr(codigo);
  }

  // PATCH /api/v1/equipamentos/:id — Admin atualiza equipamento
  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  update(@Param('id') id: string, @Body() body: { nome?: string; marca?: string; modelo?: string | null; numeroSerie?: string | null; tipoEquipamento?: string }) {
    return this.equipamentosService.update(id, body);
  }

  // PATCH /api/v1/equipamentos/:id/substituir-qr — Admin
  @Patch(':id/substituir-qr')
  @Roles(UsuarioTipo.admin)
  substituirQr(@Param('id') id: string, @Body() dto: SubstituirQrDto) {
    return this.equipamentosService.substituirQr(id, dto);
  }

  // DELETE /api/v1/equipamentos/:id (soft delete §6.5)
  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.equipamentosService.remove(id);
  }
}
