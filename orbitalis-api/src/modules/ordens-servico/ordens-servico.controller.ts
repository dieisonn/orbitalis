import {
  Body,
  Controller,
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

  // GET /api/v1/ordens-servico — Admin (listagem geral com filtro ?status=)
  @Get()
  @Roles(UsuarioTipo.admin)
  findAll(@Query('status') status?: OsStatus) {
    return this.ordensServicoService.findAll(status);
  }

  // GET /api/v1/ordens-servico/painel — Admin (dashboard)
  @Get('painel')
  @Roles(UsuarioTipo.admin)
  painel() {
    return this.ordensServicoService.painel();
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

  // PATCH /api/v1/ordens-servico/:id/status — Admin ou Técnico altera status
  @Patch(':id/status')
  @Roles(UsuarioTipo.admin, UsuarioTipo.tecnico)
  alterarStatus(@Param('id') id: string, @Body('status') status: OsStatus) {
    return this.ordensServicoService.alterarStatus(id, status);
  }

  // PATCH /api/v1/ordens-servico/:id/sincronizar — Técnico (§6.3 §6.4)
  @Patch(':id/sincronizar')
  @Roles(UsuarioTipo.tecnico)
  sincronizar(@Param('id') id: string, @Body() dto: SincronizarOsDto) {
    return this.ordensServicoService.sincronizar(id, dto);
  }
}
