import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { EquipamentosController } from './equipamentos.controller';
import { EquipamentosService } from './equipamentos.service';

@Module({
  imports: [AgendaModule],
  controllers: [EquipamentosController],
  providers: [EquipamentosService],
  exports: [EquipamentosService],
})
export class EquipamentosModule {}
