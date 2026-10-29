import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanoEquipamentoConfigDto {
  @IsUUID()
  equipamentoId: string;

  @IsOptional()
  @IsUUID()
  modeloChecklistId?: string;
}

export class CreatePlanoManutencaoDto {
  @IsUUID()
  clienteId: string;

  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @IsOptional()
  @IsUUID()
  tipoServicoId?: string;

  // Contrato atendido por este plano (precisa ser do mesmo cliente)
  @IsOptional()
  @IsUUID()
  contratoId?: string;

  @IsInt()
  @Min(1)
  frequenciaDias: number;

  // Limpezas/inspeções por equipamento incluídas no plano (obrigatório): a geração para ao atingir
  @IsInt()
  @Min(1)
  @Max(120)
  visitasPrevistas: number;

  @IsDateString()
  proximaGeracao: string;

  // 'cliente' | 'ambiente' | vazio (usa o padrão da empresa)
  @IsOptional()
  @IsIn(['cliente', 'ambiente'])
  agrupamento?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxEquipamentosPorOs?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanoEquipamentoConfigDto)
  equipamentosConfig: PlanoEquipamentoConfigDto[];
}
