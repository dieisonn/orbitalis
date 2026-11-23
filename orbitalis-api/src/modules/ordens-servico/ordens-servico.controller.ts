import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { OsStatus, UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { OrdensServicoService } from './ordens-servico.service';
import { CreateOrdemServicoDto } from './dto/create-os.dto';
import { SincronizarOsDto } from './dto/sincronizar-os.dto';
import { TriarOsDto } from './dto/triar-os.dto';
import { AtribuirTecnicoLoteDto } from './dto/atribuir-lote.dto';
import { AdicionarFotoDto, DefinirAuxiliaresDto } from './dto/foto-auxiliares.dto';

@Controller('ordens-servico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  // POST /api/v1/ordens-servico — Admin, Cliente ou Técnico (chamado via QR)
  @Post()
  @Roles(UsuarioTipo.admin, UsuarioTipo.cliente, UsuarioTipo.tecnico)
  create(@Body() dto: CreateOrdemServicoDto, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.create(dto, user);
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

  // GET /api/v1/ordens-servico/meu-resumo — painel do técnico (antes de ':id')
  @Get('meu-resumo')
  @Roles(UsuarioTipo.tecnico)
  meuResumo(@CurrentUser() user: AuthUser) {
    return this.ordensServicoService.resumoDoTecnico(user.id);
  }

  // GET /api/v1/ordens-servico/tecnico/:tecnicoId — Técnico
  @Get('tecnico/:tecnicoId')
  @Roles(UsuarioTipo.tecnico)
  findByTecnico(@Param('tecnicoId') tecnicoId: string, @CurrentUser() user: AuthUser) {
    // Técnico só lista as próprias O.S.
    if (tecnicoId !== user.id) throw new NotFoundException('Técnico não encontrado');
    return this.ordensServicoService.findByTecnico(tecnicoId);
  }

  // POST /api/v1/ordens-servico/evidencias/presigned-url — Técnico
  @Post('evidencias/presigned-url')
  @Roles(UsuarioTipo.tecnico)
  presignedUrl(@Body('filename') filename: string) {
    return this.ordensServicoService.presignedUrl(filename);
  }

  // GET /api/v1/ordens-servico/equipamento/:equipamentoId/ultimo — checklist da última visita concluída
  @Get('equipamento/:equipamentoId/ultimo')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  ultimoDoEquipamento(@Param('equipamentoId', ParseUUIDPipe) equipamentoId: string, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.ultimoChecklistDoEquipamento(equipamentoId, user);
  }

  // GET /api/v1/ordens-servico/fotos/:fotoId/arquivo — a imagem
  @Get('fotos/:fotoId/arquivo')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  async arquivoFoto(@Param('fotoId', ParseUUIDPipe) fotoId: string, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: any) {
    const f = await this.ordensServicoService.arquivoFoto(fotoId, user);
    res.header('Content-Type', f.mime);
    res.header('Cache-Control', 'private, max-age=86400');
    res.header('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(f.dados);
  }

  // DELETE /api/v1/ordens-servico/fotos/:fotoId
  @Delete('fotos/:fotoId')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  removerFoto(@Param('fotoId', ParseUUIDPipe) fotoId: string, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.removerFoto(fotoId, user);
  }

  // GET /api/v1/ordens-servico/:id/fotos
  @Get(':id/fotos')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  listarFotos(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.listarFotos(id, user);
  }

  // POST /api/v1/ordens-servico/:id/fotos
  @Post(':id/fotos')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  adicionarFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdicionarFotoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordensServicoService.adicionarFoto(id, body, user);
  }

  // PATCH /api/v1/ordens-servico/:id/auxiliares — Admin
  @Patch(':id/auxiliares')
  @Roles(UsuarioTipo.admin)
  auxiliares(@Param('id', ParseUUIDPipe) id: string, @Body() body: DefinirAuxiliaresDto) {
    return this.ordensServicoService.definirAuxiliares(id, body.tecnicoIds);
  }

  // GET /api/v1/ordens-servico/:id — Admin, Técnico ou Cliente
  @Get(':id')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico, UsuarioTipo.cliente)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.findOne(id, user);
  }

  // PATCH /api/v1/ordens-servico/:id/triar — Admin (§US07)
  @Patch(':id/triar')
  @Roles(UsuarioTipo.admin)
  triar(@Param('id') id: string, @Body() dto: TriarOsDto, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.triar(id, dto, user);
  }

  // PATCH /api/v1/ordens-servico/:id/cancelar — Admin
  @Patch(':id/cancelar')
  @Roles(UsuarioTipo.admin)
  cancelar(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.cancelar(id, user);
  }

  // PATCH /api/v1/ordens-servico/:id/concluir — Admin (assinatura + gás)
  @Patch(':id/concluir')
  @Roles(UsuarioTipo.admin)
  concluir(
    @Param('id') id: string,
    @Body() body: { assinaturaBase64?: string; tipoGas?: string; quantidadeGasGramas?: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordensServicoService.concluir(id, body, user);
  }

  // PATCH /api/v1/ordens-servico/bulk-tecnico — Triagem em bloco: atribui um técnico a várias O.S.
  @Patch('bulk-tecnico')
  @Roles(UsuarioTipo.admin)
  atribuirTecnicoLote(@Body() dto: AtribuirTecnicoLoteDto, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.atribuirTecnicoLote(dto, user);
  }

  // PATCH /api/v1/ordens-servico/bulk-status — Altera status em lote
  @Patch('bulk-status')
  @Roles(UsuarioTipo.admin)
  bulkAlterarStatus(@Body() body: { ids: string[]; status: OsStatus; dataOcorrencia?: string; observacao?: string }, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.bulkAlterarStatus(body.ids, body.status, user, { dataOcorrencia: body.dataOcorrencia, observacao: body.observacao });
  }

  // PATCH /api/v1/ordens-servico/:id/status — Admin ou Técnico altera status
  @Patch(':id/status')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  alterarStatus(
    @Param('id') id: string,
    @Body() body: { status: OsStatus; dataOcorrencia?: string; observacao?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordensServicoService.alterarStatus(id, body.status, user, { dataOcorrencia: body.dataOcorrencia, observacao: body.observacao });
  }

  // PATCH /api/v1/ordens-servico/:id/financeiro — Admin registra valores
  @Patch(':id/financeiro')
  @Roles(UsuarioTipo.admin)
  @Modulo('financeiro')
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
      tiposServicoExtras?: string[];
      enderecoId?: string | null;
      dias?: { data: string; horaInicio?: string | null; horaFim?: string | null }[];
      horaInicio?: string | null;
      horaFim?: string | null;
      ambienteId?: string;
      clienteId?: string;
      auxiliaresIds?: string[];
      modeloChecklistId?: string | null;
      semChecklist?: boolean;
    },
  ) {
    return this.ordensServicoService.update(id, body);
  }

  // POST /api/v1/ordens-servico/unir — Admin: junta O.S. do mesmo cliente/dia em uma visita (uma O.S., um evento)
  @Post('unir')
  @Roles(UsuarioTipo.admin)
  unir(@Body() body: { ids: string[]; senha: string }, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.unir(body.ids, body.senha, user.id);
  }

  // POST /api/v1/ordens-servico/excluir-lote — Admin, exclusão definitiva de várias O.S. com senha
  @Post('excluir-lote')
  @Roles(UsuarioTipo.admin)
  excluirLote(@Body() body: { ids: string[]; senha: string }, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.excluirLote(body.ids, body.senha, user.id);
  }

  // PATCH /api/v1/ordens-servico/:id/sincronizar — Técnico (§6.3 §6.4)
  @Patch(':id/sincronizar')
  @Roles(UsuarioTipo.tecnico)
  sincronizar(@Param('id') id: string, @Body() dto: SincronizarOsDto, @CurrentUser() user: AuthUser) {
    return this.ordensServicoService.sincronizar(id, dto, user);
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
