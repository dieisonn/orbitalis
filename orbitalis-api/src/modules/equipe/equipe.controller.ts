import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EquipeService } from './equipe.service';

@Controller('equipe')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
@Modulo('equipe')
export class EquipeController {
  constructor(private readonly svc: EquipeService) {}

  @Get()
  getMembros() {
    return this.svc.getMembros();
  }

  @Post('usuarios')
  criarUsuario(
    @Body() body: { nome: string; email: string; senha: string; telefone?: string; perfilAcesso?: string; permissoes?: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.criarUsuario(body, user);
  }

  @Patch(':userId/acesso')
  atualizarAcesso(
    @Param('userId') userId: string,
    @Body() body: { perfilAcesso?: string; permissoes?: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.atualizarAcesso(userId, body, user);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerMembro(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
    @Query('transferirPara') transferirPara?: string,
  ) {
    return this.svc.removerMembro(userId, user, transferirPara);
  }

  // GET /equipe/:userId/carga — O.S./planos que o membro ainda tem em aberto
  @Get(':userId/carga')
  carga(@Param('userId') userId: string) {
    return this.svc.carga(userId);
  }

  // POST /equipe/:userId/transferir — repassa O.S. pendentes, planos e agenda para outro membro
  @Post(':userId/transferir')
  @HttpCode(HttpStatus.OK)
  transferir(@Param('userId') userId: string, @Body() body: { paraUserId: string }) {
    return this.svc.transferir(userId, body.paraUserId);
  }
}
