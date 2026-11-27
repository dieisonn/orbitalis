import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

class CamposServico {
  @IsOptional() @IsString() @MaxLength(5000) descricao?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unidade?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) valor?: number;
  @IsOptional() @IsString() @MaxLength(60) codigo?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) valorCusto?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) comissaoPercentual?: number;
  @IsOptional() @IsString() @MaxLength(120) atividadeServico?: string;
  @IsOptional() @IsString() @MaxLength(20) nbs?: string;
  // null/'' = sem vínculo com tipo de serviço da agenda
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsUUID() tipoServicoId?: string | null;
}

export class CreateServicoDto extends CamposServico {
  @IsString() @MinLength(2) @MaxLength(255) nome: string;
}

export class UpdateServicoDto extends CamposServico {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) nome?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
