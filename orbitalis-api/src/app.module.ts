import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
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
import { ModelosChecklistModule } from './modules/modelos-checklist/modelos-checklist.module';
import { ConfiguracaoEmpresaModule } from './modules/configuracao-empresa/configuracao-empresa.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { ContratosModule } from './modules/contratos/contratos.module';
import { AlertasModule } from './modules/alertas/alertas.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { TiposServicoModule } from './modules/tipos-servico/tipos-servico.module';
import { BuscaModule } from './modules/busca/busca.module';
import { OrcamentosModule } from './modules/orcamentos/orcamentos.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { ConvitesModule } from './modules/convites/convites.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { EquipeModule } from './modules/equipe/equipe.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
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
    ModelosChecklistModule,
    ConfiguracaoEmpresaModule,
    NotificacoesModule,
    ContratosModule,
    AlertasModule,
    AgendaModule,
    TiposServicoModule,
    BuscaModule,
    OrcamentosModule,
    FinanceiroModule,
    ConvitesModule,
    PerfilModule,
    EquipeModule,
    OnboardingModule,
  ],
})
export class AppModule {}
