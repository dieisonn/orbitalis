import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ContratosService, RenovarContratoInput } from './contratos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('contratos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get()
  findAll(@Query('clienteId') clienteId?: string) {
    return this.contratosService.findAll(clienteId);
  }

  // Calendário anual de visitas do contrato (base do PDF entregue ao cliente)
  @Get(':id/calendario')
  calendario(@Param('id', ParseUUIDPipe) id: string, @Query('ano') ano?: string) {
    return this.contratosService.calendario(id, ano ? Number(ano) : undefined);
  }

  // Dados para a tela de renovação: contrato, planos com equipamentos e datas sugeridas
  @Get(':id/renovacao')
  renovacao(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratosService.renovacaoPreview(id);
  }

  // Renova: cria o contrato novo (e os planos), encerra o anterior e mantém o histórico
  @Post(':id/renovar')
  renovar(@Param('id', ParseUUIDPipe) id: string, @Body() body: RenovarContratoInput) {
    return this.contratosService.renovar(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contratosService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.contratosService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.contratosService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contratosService.remove(id);
  }
}
