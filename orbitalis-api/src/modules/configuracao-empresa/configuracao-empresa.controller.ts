import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { NUMERACOES } from './configuracao-empresa.service';
import { ConfiguracaoEmpresaService } from './configuracao-empresa.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Modulo } from '../../common/decorators/modulo.decorator';
import { UsuarioTipo } from '@prisma/client';

class DefinirNumeracaoDto {
  @IsIn(NUMERACOES.map((n) => n.nome)) nome!: string;
  @IsInt() @Min(1) @Max(999_999_999) proximo!: number;
}

@Controller('configuracao')
export class ConfiguracaoEmpresaController {
  constructor(private readonly service: ConfiguracaoEmpresaService) {}

  // GET /configuracao — público (sem guard) para login page e sidebar
  @Get()
  get() {
    return this.service.get();
  }

  // GET /configuracao/numeracao — próximo número de cada documento (O.S., orçamento…)
  @Get('numeracao')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  @Modulo('configuracoes')
  numeracao() {
    return this.service.numeracao();
  }

  // PUT /configuracao/numeracao — define de onde a numeração continua (só para frente)
  @Put('numeracao')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  @Modulo('configuracoes')
  definirNumeracao(@Body() dto: DefinirNumeracaoDto) {
    return this.service.definirNumeracao(dto.nome, dto.proximo);
  }

  // PATCH /configuracao — somente admin
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UsuarioTipo.admin)
  @Modulo('configuracoes')
  upsert(@Body() body: { nomeEmpresa?: string; nomeFantasia?: string; logoUrl?: string; corPrimaria?: string; cnpj?: string; telefone?: string; endereco?: string; email?: string | null; site?: string | null; instrucoesOs?: string | null; agrupamentoOsPadrao?: string; cidade?: string | null; uf?: string | null; codigoIbge?: string | null; responsavelTecnicoId?: string | null; mttrLimiteHoras?: number | null; mtbfLimiteDias?: number | null; custoHoraParada?: number | null }) {
    return this.service.upsert(body);
  }
}
