import { Module } from '@nestjs/common';
import { ModelosChecklistController } from './modelos-checklist.controller';
import { ModelosChecklistService } from './modelos-checklist.service';

@Module({
  controllers: [ModelosChecklistController],
  providers: [ModelosChecklistService],
  exports: [ModelosChecklistService],
})
export class ModelosChecklistModule {}
