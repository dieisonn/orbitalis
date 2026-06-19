import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OsStatus, UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { OrdensServicoService } from './ordens-servico.service';
import { CreateOrdemServicoDto } from './dto/create-os.dto';
import { SincronizarOsDto } from './dto/sincronizar-os.dto';
import { TriarOsDto } from './dto/triar-os.dto';

@Controller('ordens-servico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  // POST /api/v1/ordens-servico — Admin, Cliente ou Técnico (chamado via QR)
  @Post()
  @Roles(UsuarioTipo.admin, UsuarioTipo.cliente, UsuarioTipo.tecnico)
  create(@Body() dto: CreateOrdemServicoDto) {
    return this.ordensServicoService.create(dto);
  }

  // GET /api/v1/ordens-servico/meus — histórico do cliente autenticado
  @Get('meus')
  @Roles(UsuarioTipo.cliente)
  findMeus(@CurrentUser() user: AuthUser) {
    return this.ordensServicoService.findMeus(user.id);
  }

  // GET /api/v1/ordens-servico — Admin (listagem com filtros + paginação)
  @Get()
  @Roles(UsuarioTipo.admin)
  findAll(
    @Query('status') status?: OsStatus,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('atrasadas') atrasadas?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    return this.ordensServicoService.findAll({
      status,
      tecnicoId,
      clienteId,
      dataInicio,
      dataFim,
      atrasadas: atrasadas === '1' || atrasadas === 'true',
      q,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      orderBy,
    });
  }

  // GET /api/v1/ordens-servico/painel — Admin (dashboard)
  @Get('painel')
  @Roles(UsuarioTipo.admin)
  painel() {
    return this.ordensServicoService.painel();
  }

  // GET /api/v1/ordens-servico/historico?ano=XXXX — Admin
  @Get('historico')
  @Roles(UsuarioTipo.admin)
  historico(@Query('ano') ano?: string) {
    return this.ordensServicoService.historico(ano ? Number(ano) : undefined);
  }

  // GET /api/v1/ordens-servico/tecnico/:tecnicoId — Técnico
  @Get('tecnico/:tecnicoId')
  @Roles(UsuarioTipo.tecnico)
  findByTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.ordensServicoService.findByTecnico(tecnicoId);
  }

  // POST /api/v1/ordens-servico/evidencias/presigned-url — Técnico
  @Post('evidencias/presigned-url')
  @Roles(UsuarioTipo.tecnico)
  presignedUrl(@Body('filename') filename: string) {
    return this.ordensServicoService.presignedUrl(filename);
  }

  // GET /api/v1/ordens-servico/:id — Admin ou Técnico
  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  findOne(@Param('id') id: string) {
    return this.ordensServicoService.findOne(id);
  }

  // PATCH /api/v1/ordens-servico/:id/triar — Admin (§US07)
  @Patch(':id/triar')
  @Roles(UsuarioTipo.admin)
  triar(@Param('id') id: string, @Body() dto: TriarOsDto) {
    return this.ordensServicoService.triar(id, dto);
  }

  // PATCH /api/v1/ordens-servico/:id/cancelar — Admin
  @Patch(':id/cancelar')
  @Roles(UsuarioTipo.admin)
  cancelar(@Param('id') id: string) {
    return this.ordensServicoService.cancelar(id);
  }

  // PATCH /api/v1/ordens-servico/:id/concluir — Admin (assinatura + gás)
  @Patch(':id/concluir')
  @Roles(UsuarioTipo.admin)
  concluir(
    @Param('id') id: string,
    @Body() body: { assinaturaBase64?: string; tipoGas?: string; quantidadeGasGramas?: number },
  ) {
    return this.ordensServicoService.concluir(id, body);
  }

  // PATCH /api/v1/ordens-servico/:id/status — Admin ou Técnico altera status
  @Patch(':id/status')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  alterarStatus(@Param('id') id: string, @Body('status') status: OsStatus) {
    return this.ordensServicoService.alterarStatus(id, status);
  }

  // PATCH /api/v1/ordens-servico/:id/financeiro — Admin registra valores
  @Patch(':id/financeiro')
  @Roles(UsuarioTipo.admin)
  financeiro(
    @Param('id') id: string,
    @Body() body: { valorMaoObra?: number; valorPecas?: number },
  ) {
    return this.ordensServicoService.atualizarFinanceiro(id, body);
  }

  // PATCH /api/v1/ordens-servico/:id — Admin, edição geral
  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  update(
    @Param('id') id: string,
    @Body() body: {
      dataAgendamento?: string;
      observacoesGerais?: string | null;
      tecnicoId?: string | null;
      tipo?: string;
      tipoServicoId?: string | null;
      horaInicio?: string | null;
      horaFim?: string | null;
    },
  ) {
    return this.ordensServicoService.update(id, body);
  }

  // PATCH /api/v1/ordens-servico/:id/sincronizar — Técnico (§6.3 §6.4)
  @Patch(':id/sincronizar')
  @Roles(UsuarioTipo.tecnico)
  sincronizar(@Param('id') id: string, @Body() dto: SincronizarOsDto) {
    return this.ordensServicoService.sincronizar(id, dto);
  }

  // DELETE /api/v1/ordens-servico/:id — Admin, exclusão definitiva com senha
  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  excluir(
    @Param('id') id: string,
    @Body('senha') senha: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordensServicoService.excluir(id, senha, user.id);
  }
}
