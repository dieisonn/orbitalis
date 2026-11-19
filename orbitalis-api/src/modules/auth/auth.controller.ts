import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EsqueciSenhaDto, RedefinirSenhaDto, TrocarSenhaDto } from './dto/senha.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/v1/auth/trocar-senha — quem está logado troca a própria senha
  @Post('trocar-senha')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  trocarSenha(@CurrentUser() user: AuthUser, @Body() dto: TrocarSenhaDto) {
    return this.authService.trocarSenha(user.id, dto);
  }

  // POST /api/v1/auth/esqueci-senha — pública: envia o link por e-mail (a resposta é sempre a mesma)
  @Post('esqueci-senha')
  @HttpCode(HttpStatus.OK)
  esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.authService.esqueciSenha(dto.email);
  }

  // POST /api/v1/auth/redefinir-senha — pública: troca a senha com o token recebido por e-mail
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.authService.redefinirSenha(dto);
  }

  // POST /api/v1/auth/registrar — cria empresa + primeiro admin
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  registrar(@Body() dto: RegistrarDto) {
    return this.authService.registrar(dto);
  }
}
