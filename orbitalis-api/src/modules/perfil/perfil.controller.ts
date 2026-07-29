import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';

@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly svc: PerfilService) {}

  @Get()
  getMeu(@CurrentUser() user: AuthUser) {
    return this.svc.getMeu(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdatePerfilDto) {
    return this.svc.update(user.id, dto);
  }

  @Post('senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  trocarSenha(@CurrentUser() user: AuthUser, @Body() dto: TrocarSenhaDto) {
    return this.svc.trocarSenha(user.id, dto);
  }
}
