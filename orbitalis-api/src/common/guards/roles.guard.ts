import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioTipo } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { MODULO_KEY } from '../decorators/modulo.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const alvos = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<UsuarioTipo[]>(ROLES_KEY, alvos);
    const modulos = this.reflector.getAllAndOverride<string[]>(MODULO_KEY, alvos);

    const { user } = context.switchToHttp().getRequest();

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) return false;

    // Perfis restritos do escritório: só entram nos módulos liberados (permissoes null = acesso total)
    if (modulos && modulos.length > 0 && user?.role === UsuarioTipo.admin && Array.isArray(user.permissoes)) {
      return modulos.some((m) => user.permissoes.includes(m));
    }
    return true;
  }
}
