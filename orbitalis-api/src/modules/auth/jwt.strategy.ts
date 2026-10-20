import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../../common/jwt-secret';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  empresaId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();

    // Tokens emitidos antes do isolamento por empresa não carregam empresaId:
    // completa pelo cadastro do usuário para o filtro de tenant valer também para eles.
    let empresaId = payload.empresaId;
    if (!empresaId) {
      const u = await this.prisma.usuario.findUnique({ where: { id: payload.sub }, select: { empresaId: true } });
      empresaId = u?.empresaId ?? undefined;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      empresaId,
    };
  }
}
