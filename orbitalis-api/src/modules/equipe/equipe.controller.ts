import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EquipeService } from './equipe.service';

@Controller('equipe')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class EquipeController {
  constructor(private readonly svc: EquipeService) {}

  @Get()
  getMembros() {
    return this.svc.getMembros();
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerMembro(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.removerMembro(userId, user.id);
  }
}
