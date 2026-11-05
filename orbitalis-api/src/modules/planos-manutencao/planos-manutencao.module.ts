import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { CronModule } from '../cron/cron.module';
import { PlanosManutencaoController } from './planos-manutencao.controller';
import { PlanosManutencaoService } from './planos-manutencao.service';

@Module({
  imports: [CronModule, AgendaModule],
  controllers: [PlanosManutencaoController],
  providers: [PlanosManutencaoService],
})
export class PlanosManutencaoModule {}
