import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConvitesController } from './convites.controller';
import { ConvitesService } from './convites.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'fallback-secret',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as any },
    }),
  ],
  controllers: [ConvitesController],
  providers: [ConvitesService],
})
export class ConvitesModule {}
