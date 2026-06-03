import { Module } from '@nestjs/common';
import { AmbientesController } from './ambientes.controller';
import { AmbientesService } from './ambientes.service';

@Module({
  controllers: [AmbientesController],
  providers: [AmbientesService],
  exports: [AmbientesService],
})
export class AmbientesModule {}
