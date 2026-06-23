import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { UsuarioTipo } from '@prisma/client'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { DiagnosticosLgmvService } from './diagnosticos-lgmv.service'
import { CreateDiagnosticoDto } from './dto/create-diagnostico.dto'

@Controller('diagnosticos-lgmv')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiagnosticosLgmvController {
  constructor(private readonly service: DiagnosticosLgmvService) {}

  @Post()
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  create(@Body() dto: CreateDiagnosticoDto) {
    return this.service.create(dto)
  }

  @Get('equipamento/:equipamentoId')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findByEquipamento(@Param('equipamentoId') id: string) {
    return this.service.findByEquipamento(id)
  }

  @Get('os/:osId')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findByOs(@Param('osId') id: string) {
    return this.service.findByOs(id)
  }

  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Patch(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  update(@Param('id') id: string, @Body() body: { dataInspecao?: string | null }) {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
