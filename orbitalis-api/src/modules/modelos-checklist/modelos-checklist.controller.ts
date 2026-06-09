import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModelosChecklistService } from './modelos-checklist.service';
import { CreateModeloChecklistDto } from './dto/create-modelo-checklist.dto';

@Controller('modelos-checklist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelosChecklistController {
  constructor(private readonly service: ModelosChecklistService) {}

  @Get()
  @Roles(UsuarioTipo.admin)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UsuarioTipo.admin)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UsuarioTipo.admin)
  create(@Body() dto: CreateModeloChecklistDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UsuarioTipo.admin)
  update(@Param('id') id: string, @Body() dto: CreateModeloChecklistDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
