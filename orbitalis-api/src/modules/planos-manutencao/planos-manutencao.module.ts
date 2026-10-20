import { Module } from '@nestjs/common';
import { CronModule } from '../cron/cron.module';
import { PlanosManutencaoController } from './planos-manutencao.controller';
import { PlanosManutencaoService } from './planos-manutencao.service';

@Module({
  imports: [CronModule],
  controllers: [PlanosManutencaoController],
  providers: [PlanosManutencaoService],
})
export class PlanosManutencaoModule {}
