import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AmbientesService } from './ambientes.service';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';

@Controller('ambientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AmbientesController {
  constructor(private readonly ambientesService: AmbientesService) {}

  // POST /api/v1/ambientes
  @Post()
  @Roles(UsuarioTipo.admin)
  create(@Body() dto: CreateAmbienteDto) {
    return this.ambientesService.create(dto);
  }

  // GET /api/v1/ambientes
  @Get()
  @Roles(UsuarioTipo.admin)
  findAll() {
    return this.ambientesService.findAll();
  }

  // GET /api/v1/ambientes/:id
  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.cliente)
  findOne(@Param('id') id: string) {
    return this.ambientesService.findOne(id);
  }

  // DELETE /api/v1/ambientes/:id (soft delete §6.5)
  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.ambientesService.remove(id);
  }
}
