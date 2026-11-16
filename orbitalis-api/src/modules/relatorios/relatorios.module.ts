import { Module } from '@nestjs/common';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosAnaliticosService } from './relatorios-analiticos.service';
import { RelatoriosService } from './relatorios.service';

@Module({
  controllers: [RelatoriosController],
  providers: [RelatoriosService, RelatoriosAnaliticosService],
})
export class RelatoriosModule {}
