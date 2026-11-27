import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, StreamableFile, UseGuards,
} from '@nestjs/common';
import { OrcamentoStatus, UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AlterarStatusOrcamentoDto, AnexoOrcamentoDto, CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { OrcamentosService } from './orcamentos.service';

@Controller('orcamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('orcamentos')
export class OrcamentosController {
  constructor(private readonly svc: OrcamentosService) {}

  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: OrcamentoStatus,
  ) {
    return this.svc.listar(clienteId, status);
  }

  // Funil de conversão das visitas (antes de ':id')
  @Get('funil')
  funil(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.svc.funil(de, ate);
  }

  @Get('visitas-recentes')
  visitasRecentes() {
    return this.svc.visitasRecentes();
  }

  @Get('meus')
  @Roles(UsuarioTipo.admin, UsuarioTipo.cliente)
  listarMeus(@CurrentUser() user: AuthUser) {
    return this.svc.listarDoCliente(user.id);
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.svc.buscarPorId(id);
  }

  @Post()
  criar(@Body() dto: CreateOrcamentoDto, @CurrentUser() user: AuthUser) {
    return this.svc.criar(dto, user.id);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: Partial<CreateOrcamentoDto>, @CurrentUser() user: AuthUser) {
    return this.svc.atualizar(id, dto, user.id);
  }

  // Troca manual de status (aprovar baixa o estoque; sair de aprovado devolve)
  @Patch(':id/status')
  alterarStatus(@Param('id') id: string, @Body() dto: AlterarStatusOrcamentoDto, @CurrentUser() user: AuthUser) {
    return this.svc.alterarStatus(id, dto.status as OrcamentoStatus, user.id);
  }

  @Post(':id/anexos')
  anexar(@Param('id') id: string, @Body() dto: AnexoOrcamentoDto) {
    return this.svc.anexar(id, dto);
  }

  @Get(':id/anexos/:anexoId')
  async baixarAnexo(@Param('id') id: string, @Param('anexoId') anexoId: string) {
    const a = await this.svc.baixarAnexo(id, anexoId);
    return new StreamableFile(Buffer.from(a.conteudo), {
      type: a.tipo,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(a.nome)}`,
    });
  }

  @Delete(':id/anexos/:anexoId')
  removerAnexo(@Param('id') id: string, @Param('anexoId') anexoId: string) {
    return this.svc.removerAnexo(id, anexoId);
  }

  // Gera (ou devolve) a O.S. de um orçamento aprovado; ambienteId só é necessário se
  // o orçamento não tem ambiente e o cliente possui vários.
  @Post(':id/gerar-os')
  gerarOs(@Param('id') id: string, @Body() body: { ambienteId?: string }) {
    return this.svc.gerarOs(id, body?.ambienteId);
  }

  @Post(':id/enviar')
  enviar(@Param('id') id: string) {
    return this.svc.enviar(id);
  }

  @Delete(':id')
  excluir(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.excluir(id, user.id);
  }
}

// Rota pública — sem guard de auth
@Controller('orcamentos/publico')
export class OrcamentosPublicoController {
  constructor(private readonly svc: OrcamentosService) {}

  @Get(':token')
  buscarPorToken(@Param('token') token: string) {
    return this.svc.buscarPorToken(token);
  }

  @Post(':token/aprovar')
  aprovar(@Param('token') token: string) {
    return this.svc.aprovar(token);
  }

  @Post(':token/rejeitar')
  rejeitar(@Param('token') token: string) {
    return this.svc.rejeitar(token);
  }
}
