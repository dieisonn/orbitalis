import { Body, Controller, Delete, Get, Patch, Query, Redirect, UseGuards } from '@nestjs/common';
import { ConfiguracaoEmpresaService } from './configuracao-empresa.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('configuracao')
export class ConfiguracaoEmpresaController {
  constructor(
    private readonly service: ConfiguracaoEmpresaService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  // GET /configuracao — público (sem guard) para login page e sidebar
  @Get()
  get() {
    return this.service.get();
  }

  // PATCH /configuracao — somente admin
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  upsert(@Body() body: { nomeEmpresa?: string; nomeFantasia?: string; logoUrl?: string; corPrimaria?: string; cnpj?: string; telefone?: string; endereco?: string; responsavelTecnicoId?: string | null }) {
    return this.service.upsert(body);
  }

  // GET /configuracao/google/auth-url — retorna URL de login Google
  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  getGoogleAuthUrl() {
    const url = this.googleCalendar.getAuthUrl();
    if (!url) return { error: 'GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados' };
    return { url };
  }

  // GET /configuracao/google/callback — chamado pelo Google após o login (sem guard JWT)
  @Get('google/callback')
  @Redirect()
  async googleCallback(@Query('code') code: string, @Query('error') error: string) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

    if (error || !code) {
      return { url: `${frontendUrl}/configuracoes?google=erro` };
    }

    try {
      await this.googleCalendar.handleCallback(code);
      return { url: `${frontendUrl}/configuracoes?google=sucesso` };
    } catch (err) {
      return { url: `${frontendUrl}/configuracoes?google=erro` };
    }
  }

  // DELETE /configuracao/google — desconectar Google Calendar
  @Delete('google')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  async desconectarGoogle() {
    await this.googleCalendar.desconectar();
    return { message: 'Google Calendar desconectado' };
  }
}
