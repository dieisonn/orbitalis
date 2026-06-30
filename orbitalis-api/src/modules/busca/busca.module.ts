import { Module } from '@nestjs/common';
import { BuscaController } from './busca.controller';
import { BuscaService } from './busca.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BuscaController],
  providers: [BuscaService],
})
export class BuscaModule {}
