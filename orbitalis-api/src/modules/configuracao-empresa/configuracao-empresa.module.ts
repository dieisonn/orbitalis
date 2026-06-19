import { Module } from '@nestjs/common';
import { ConfiguracaoEmpresaController } from './configuracao-empresa.controller';
import { ConfiguracaoEmpresaService } from './configuracao-empresa.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [PrismaModule, GoogleCalendarModule],
  controllers: [ConfiguracaoEmpresaController],
  providers: [ConfiguracaoEmpresaService],
  exports: [ConfiguracaoEmpresaService],
})
export class ConfiguracaoEmpresaModule {}
