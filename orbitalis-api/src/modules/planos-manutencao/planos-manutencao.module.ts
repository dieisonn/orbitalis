import { Module } from '@nestjs/common';
import { CronModule } from '../cron/cron.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { PlanosManutencaoController } from './planos-manutencao.controller';
import { PlanosManutencaoService } from './planos-manutencao.service';

@Module({
  imports: [CronModule, GoogleCalendarModule],
  controllers: [PlanosManutencaoController],
  providers: [PlanosManutencaoService],
})
export class PlanosManutencaoModule {}
