import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class FornecedoresController {
  constructor(private readonly svc: FornecedoresService) {}

  @Get()
  listar(@Query('q') q?: string, @Query('ativo') ativo?: string) {
    return this.svc.listar(q, ativo);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.buscar(id);
  }

  @Post()
  criar(@Body() dto: CreateFornecedorDto) {
    return this.svc.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFornecedorDto) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.excluir(id);
  }
}
