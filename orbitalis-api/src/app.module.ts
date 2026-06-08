import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { AmbientesModule } from './modules/ambientes/ambientes.module';
import { EquipamentosModule } from './modules/equipamentos/equipamentos.module';
import { OrdensServicoModule } from './modules/ordens-servico/ordens-servico.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { PlanosManutencaoModule } from './modules/planos-manutencao/planos-manutencao.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  controllers: [HealthController],
  imports: [
    PrismaModule,
    AuthModule,
    ClientesModule,
    AmbientesModule,
    EquipamentosModule,
    OrdensServicoModule,
    RelatoriosModule,
    PlanosManutencaoModule,
    UsuariosModule,
  ],
})
export class AppModule {}
