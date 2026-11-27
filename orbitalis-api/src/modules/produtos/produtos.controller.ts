import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImportarPlanilhaDto } from '../../common/dto/importar-planilha.dto';
import { CreateProdutoDto, MovimentarEstoqueDto, UpdateProdutoDto } from './dto/produto.dto';
import { ProdutosService } from './produtos.service';
import { ProdutosLoteService } from './produtos-lote.service';
import { LoteDto, SalvarMarkupDto, SelecaoDto } from './dto/lote.dto';

@Controller('produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class ProdutosController {
  constructor(private readonly svc: ProdutosService, private readonly lote: ProdutosLoteService) {}

  @Get()
  listar(
    @Query('q') q?: string, @Query('categoria') categoria?: string, @Query('ativo') ativo?: string, @Query('situacao') situacao?: string,
    @Query('pagina') pagina?: string, @Query('limite') limite?: string,
  ) {
    // com `limite` devolve { itens, total, pagina, limite }; sem ele, a lista inteira (uso interno)
    if (limite) return this.svc.listarPaginado({ q, categoria, ativo, situacao }, Number(pagina) || 1, Number(limite));
    return this.svc.listar({ q, categoria, ativo, situacao });
  }

  @Get('markup')
  markup() {
    return this.lote.obterMarkup();
  }

  @Put('markup')
  salvarMarkup(@Body() dto: SalvarMarkupDto) {
    return this.lote.salvarMarkup(dto);
  }

  @Post('lote')
  executarLote(@Body() dto: LoteDto) {
    return this.lote.executar(dto);
  }

  @Post('por-selecao')
  porSelecao(@Body() dto: SelecaoDto) {
    return this.lote.porSelecao(dto);
  }

  // Rotas fixas antes de ':id'
  @Get('categorias')
  categorias() {
    return this.svc.categorias();
  }

  @Get('estoque/resumo')
  resumo() {
    return this.svc.resumo();
  }

  @Get('movimentos')
  movimentos(
    @Query('produtoId') produtoId?: string, @Query('tipo') tipo?: string,
    @Query('de') de?: string, @Query('ate') ate?: string, @Query('limite') limite?: string,
  ) {
    return this.svc.movimentos({ produtoId, tipo, de, ate, take: limite ? Number(limite) : undefined });
  }

  @Get('exportar')
  async exportar() {
    return this.xlsx(await this.svc.exportar(), 'Produtos.xlsx');
  }

  @Get('modelo-importacao')
  async modelo() {
    return this.xlsx(await this.svc.modeloImportacao(), 'Importacao_Modelo_Produtos.xlsx');
  }

  @Post('importar')
  importar(@Body() dto: ImportarPlanilhaDto, @CurrentUser() user: AuthUser) {
    return this.svc.importar(dto.arquivoBase64, dto.simular ?? true, user.id);
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
  criar(@Body() dto: CreateProdutoDto, @CurrentUser() user: AuthUser) {
    return this.svc.criar(dto, user.id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProdutoDto) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.excluir(id);
  }

  @Post(':id/movimentar')
  movimentar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MovimentarEstoqueDto, @CurrentUser() user: AuthUser) {
    return this.svc.movimentar(id, dto, user.id);
  }
}
