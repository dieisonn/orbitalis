import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import { AssinarPushDto, DesassinarPushDto, MarcarLidosDto } from './push.dto';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('chave')
  chave() {
    return this.push.chavePublica();
  }

  @Post('assinar')
  assinar(@Body() body: AssinarPushDto, @CurrentUser() user: AuthUser) {
    return this.push.assinar(user.id, body);
  }

  @Post('desassinar')
  desassinar(@Body() body: DesassinarPushDto, @CurrentUser() user: AuthUser) {
    return this.push.desassinar(user.id, body.endpoint);
  }

  @Get('avisos')
  avisos(@CurrentUser() user: AuthUser) {
    return this.push.listarAvisos(user.id);
  }

  @Post('avisos/lidos')
  lidos(@Body() body: MarcarLidosDto, @CurrentUser() user: AuthUser) {
    return this.push.marcarLidos(user.id, body.ids);
  }

  // Teste: manda um aviso para os aparelhos do próprio usuário
  @Post('testar')
  async testar(@CurrentUser() user: AuthUser) {
    await this.push.notificar([user.id], { titulo: 'Orbitalis', corpo: 'Avisos ativados neste aparelho.', url: '/minhas-os' });
    return { ok: true };
  }
}
