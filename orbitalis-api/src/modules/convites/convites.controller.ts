import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConvitesService } from './convites.service';
import { CriarConviteDto } from './dto/criar-convite.dto';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';

@Controller('convites')
export class ConvitesController {
  constructor(private readonly svc: ConvitesService) {}

  // POST /api/v1/convites — admin gera link de convite
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  gerar(@Body() dto: CriarConviteDto) {
    return this.svc.gerar(dto);
  }

  // GET /api/v1/convites/:token — valida token (público)
  @Get(':token')
  buscarPorToken(@Param('token') token: string) {
    return this.svc.buscarPorToken(token);
  }

  // POST /api/v1/convites/:token/aceitar — completa cadastro (público)
  @Post(':token/aceitar')
  @HttpCode(HttpStatus.CREATED)
  aceitar(@Param('token') token: string, @Body() dto: AceitarConviteDto) {
    return this.svc.aceitar(token, dto);
  }
}
