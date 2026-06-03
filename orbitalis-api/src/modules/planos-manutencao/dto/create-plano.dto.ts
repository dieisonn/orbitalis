import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePlanoManutencaoDto {
  @IsUUID()
  ambienteId: string;

  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @IsOptional()
  @IsUUID()
  modeloChecklistId?: string;

  @IsInt()
  @Min(1)
  frequenciaDias: number;

  @IsDateString()
  proximaGeracao: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
