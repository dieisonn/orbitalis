import { Module } from '@nestjs/common';
import { TiposServicoController } from './tipos-servico.controller';
import { TiposServicoService } from './tipos-servico.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposServicoController],
  providers: [TiposServicoService],
  exports: [TiposServicoService],
})
export class TiposServicoModule {}
