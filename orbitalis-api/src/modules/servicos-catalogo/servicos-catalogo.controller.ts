import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImportarPlanilhaDto } from '../../common/dto/importar-planilha.dto';
import { CreateServicoDto, UpdateServicoDto } from './dto/servico.dto';
import { ServicosCatalogoService } from './servicos-catalogo.service';

@Controller('catalogo-servicos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class ServicosCatalogoController {
  constructor(private readonly svc: ServicosCatalogoService) {}

  @Get()
  listar(@Query('q') q?: string, @Query('ativo') ativo?: string) {
    return this.svc.listar(q, ativo);
  }

  @Get('exportar')
  async exportar() {
    return this.xlsx(await this.svc.exportar(), 'Servicos.xlsx');
  }

  @Get('modelo-importacao')
  async modelo() {
    return this.xlsx(await this.svc.modeloImportacao(), 'Importacao_Modelo_Servicos.xlsx');
  }

  @Post('importar')
  importar(@Body() dto: ImportarPlanilhaDto) {
    return this.svc.importar(dto.arquivoBase64, dto.simular ?? true);
  }

  private xlsx(buf: Buffer, nome: string) {
    return new StreamableFile(buf, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${nome}"`,
    });
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.buscar(id);
  }

  @Post()
  criar(@Body() dto: CreateServicoDto) {
    return this.svc.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServicoDto) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.excluir(id);
  }
}
