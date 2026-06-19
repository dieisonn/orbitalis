import { Module } from '@nestjs/common';
import { OrdensServicoController } from './ordens-servico.controller';
import { OrdensServicoService } from './ordens-servico.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [NotificacoesModule, GoogleCalendarModule],
  controllers: [OrdensServicoController],
  providers: [OrdensServicoService],
})
export class OrdensServicoModule {}
