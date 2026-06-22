import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AlertasModule } from '../alertas/alertas.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificacoesModule, AlertasModule, GoogleCalendarModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
