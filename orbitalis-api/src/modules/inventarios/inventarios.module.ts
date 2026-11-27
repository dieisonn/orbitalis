import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProdutosModule } from '../produtos/produtos.module';
import { InventariosController } from './inventarios.controller';
import { InventariosService } from './inventarios.service';

@Module({
  imports: [PrismaModule, ProdutosModule],
  controllers: [InventariosController],
  providers: [InventariosService],
})
export class InventariosModule {}
