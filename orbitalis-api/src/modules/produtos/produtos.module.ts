import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';
import { ProdutosLoteService } from './produtos-lote.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProdutosController],
  providers: [ProdutosService, ProdutosLoteService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
