import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FeriadosController } from './feriados.controller';
import { FeriadosService } from './feriados.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeriadosController],
  providers: [FeriadosService],
  exports: [FeriadosService],
})
export class FeriadosModule {}
