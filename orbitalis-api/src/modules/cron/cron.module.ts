import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificacoesModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
