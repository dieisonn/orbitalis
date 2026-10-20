import { Module } from '@nestjs/common';
import { OrdensServicoController } from './ordens-servico.controller';
import { OrdensServicoService } from './ordens-servico.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [NotificacoesModule, AgendaModule],
  controllers: [OrdensServicoController],
  providers: [OrdensServicoService],
})
export class OrdensServicoModule {}
