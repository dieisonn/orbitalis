import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BaixaDto, CategoriaDto, ContaDto, CreateLancamentoDto, GerarReceberDto, UpdateLancamentoDto } from './dto/financeiro.dto';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('financeiro')
export class FinanceiroController {
  constructor(private readonly svc: FinanceiroService) {}

  @Get('resumo')
  resumo() { return this.svc.resumo(); }

  @Get('fluxo')
  fluxo(@Query('de') de: string, @Query('ate') ate: string, @Query('agrupar') agrupar?: string) {
    return this.svc.fluxo(de, ate, agrupar === 'mes' ? 'mes' : 'dia');
  }

  @Get('a-faturar')
  aFaturar() { return this.svc.aFaturar(); }

  @Post('orcamentos/:id/gerar-receber')
  gerarReceber(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GerarReceberDto, @CurrentUser() user: { id: string }) {
    return this.svc.gerarReceberDoOrcamento(id, dto, user?.id ?? null);
  }

  // ─── contas e categorias ───
  @Get('contas') contas() { return this.svc.listarContas(); }
  @Post('contas') criarConta(@Body() dto: ContaDto) { return this.svc.criarConta(dto); }
  @Patch('contas/:id') atualizarConta(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ContaDto) { return this.svc.atualizarConta(id, dto); }

  @Get('categorias') categorias(@Query('tipo') tipo?: string) { return this.svc.listarCategorias(tipo); }
  @Post('categorias') criarCategoria(@Body() dto: CategoriaDto) { return this.svc.criarCategoria(dto); }
  @Patch('categorias/:id') atualizarCategoria(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoriaDto) { return this.svc.atualizarCategoria(id, dto); }

  // ─── lançamentos ───
  @Get('lancamentos')
  listar(
    @Query('tipo') tipo?: string, @Query('status') status?: string, @Query('q') q?: string, @Query('de') de?: string, @Query('ate') ate?: string,
    @Query('contaId') contaId?: string, @Query('categoriaId') categoriaId?: string, @Query('clienteId') clienteId?: string,
    @Query('fornecedorId') fornecedorId?: string, @Query('orcamentoId') orcamentoId?: string,
    @Query('pagina') pagina?: string, @Query('limite') limite?: string, @Query('ordem') ordem?: string, @Query('dir') dir?: string,
  ) {
    return this.svc.listar({ tipo, status, q, de, ate, contaId, categoriaId, clienteId, fornecedorId, orcamentoId, pagina: Number(pagina) || 1, limite: Number(limite) || 50, ordem, dir });
  }

  @Post('lancamentos')
  criar(@Body() dto: CreateLancamentoDto, @CurrentUser() user: { id: string }) { return this.svc.criar(dto, user?.id ?? null); }

  @Get('lancamentos/:id') buscar(@Param('id', ParseUUIDPipe) id: string) { return this.svc.buscar(id); }
  @Patch('lancamentos/:id') atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLancamentoDto) { return this.svc.atualizar(id, dto); }
  @Post('lancamentos/:id/baixar') baixar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BaixaDto) { return this.svc.baixar(id, dto); }
  @Post('lancamentos/:id/estornar') estornar(@Param('id', ParseUUIDPipe) id: string) { return this.svc.estornar(id); }
  @Post('lancamentos/:id/cancelar') cancelar(@Param('id', ParseUUIDPipe) id: string) { return this.svc.cancelar(id); }
  @Delete('lancamentos/:id') excluir(@Param('id', ParseUUIDPipe) id: string) { return this.svc.excluir(id); }
}
