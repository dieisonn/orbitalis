import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AlertasModule } from '../alertas/alertas.module';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificacoesModule, AlertasModule, AgendaModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
