import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { EquipeController } from './equipe.controller';
import { EquipeService } from './equipe.service';

@Module({
  imports: [AgendaModule],
  controllers: [EquipeController],
  providers: [EquipeService],
})
export class EquipeModule {}
