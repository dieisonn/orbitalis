import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImportarPlanilhaDto } from '../../common/dto/importar-planilha.dto';
import { CreateFornecedorDto, LoteFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class FornecedoresController {
  constructor(private readonly svc: FornecedoresService) {}

  @Get()
  listar(@Query('q') q?: string, @Query('ativo') ativo?: string, @Query('pagina') pagina?: string, @Query('limite') limite?: string, @Query('ordem') ordem?: string, @Query('dir') dir?: string) {
    // com `limite` devolve { itens, total, pagina, limite }; sem ele, a lista inteira (uso interno)
    if (limite) return this.svc.listarPaginado(q, ativo, Number(pagina) || 1, Number(limite), ordem, dir);
    return this.svc.listar(q, ativo);
  }

  @Get('exportar')
  async exportar() {
    return this.xlsx(await this.svc.exportar(), 'Fornecedores.xlsx');
  }

  @Get('modelo-importacao')
  async modelo() {
    return this.xlsx(await this.svc.modeloImportacao(), 'Importacao_Modelo_Fornecedores.xlsx');
  }

  @Post('importar')
  importar(@Body() dto: ImportarPlanilhaDto) {
    return this.svc.importar(dto.arquivoBase64, dto.simular ?? true);
  }

  @Post('lote')
  lote(@Body() dto: LoteFornecedorDto) {
    return this.svc.executarLote(dto);
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
