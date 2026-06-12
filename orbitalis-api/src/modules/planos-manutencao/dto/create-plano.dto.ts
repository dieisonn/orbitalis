import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
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

  @IsInt()
  @Min(1)
  frequenciaDias: number;

  @IsDateString()
  proximaGeracao: string;

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
