import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { OrcamentoStatus, UsuarioTipo } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { OrcamentosService } from './orcamentos.service';

@Controller('orcamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class OrcamentosController {
  constructor(private readonly svc: OrcamentosService) {}

  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: OrcamentoStatus,
  ) {
    return this.svc.listar(clienteId, status);
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
  atualizar(@Param('id') id: string, @Body() dto: Partial<CreateOrcamentoDto>) {
    return this.svc.atualizar(id, dto);
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
  excluir(@Param('id') id: string) {
    return this.svc.excluir(id);
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
