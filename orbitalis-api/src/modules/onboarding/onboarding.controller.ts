import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UsuarioTipo } from '@prisma/client';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UsuarioTipo.admin)
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Get()
  getStatus(@CurrentUser() user: AuthUser) {
    return this.svc.getStatus(user.id);
  }
}
