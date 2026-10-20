import { Module } from '@nestjs/common';
import { ModelosChecklistController } from './modelos-checklist.controller';
import { ModelosChecklistService } from './modelos-checklist.service';
import { PadroesIniciaisService } from './padroes-iniciais.service';

@Module({
  controllers: [ModelosChecklistController],
  providers: [ModelosChecklistService, PadroesIniciaisService],
  exports: [ModelosChecklistService],
})
export class ModelosChecklistModule {}
