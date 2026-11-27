import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServicosCatalogoController } from './servicos-catalogo.controller';
import { ServicosCatalogoService } from './servicos-catalogo.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicosCatalogoController],
  providers: [ServicosCatalogoService],
  exports: [ServicosCatalogoService],
})
export class ServicosCatalogoModule {}
