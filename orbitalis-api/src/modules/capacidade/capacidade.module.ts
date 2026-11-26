import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CapacidadeController } from './capacidade.controller';
import { CapacidadeService } from './capacidade.service';

@Module({
  imports: [PrismaModule],
  controllers: [CapacidadeController],
  providers: [CapacidadeService],
})
export class CapacidadeModule {}
