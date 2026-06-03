import { SetMetadata } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UsuarioTipo[]) => SetMetadata(ROLES_KEY, roles);
