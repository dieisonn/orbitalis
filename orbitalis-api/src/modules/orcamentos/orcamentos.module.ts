import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrcamentosController, OrcamentosPublicoController } from './orcamentos.controller';
import { AgendaModule } from '../agenda/agenda.module';
import { OrcamentosService } from './orcamentos.service';

@Module({
  imports: [PrismaModule, AgendaModule],
  controllers: [OrcamentosController, OrcamentosPublicoController],
  providers: [OrcamentosService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
