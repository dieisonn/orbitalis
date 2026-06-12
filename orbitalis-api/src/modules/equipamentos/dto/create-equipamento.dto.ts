import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateEquipamentoDto {
  @IsUUID()
  ambienteId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsString()
  @MaxLength(100)
  marca: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroSerie?: string;

  @IsString()
  @MaxLength(100)
  tipoEquipamento: string;

  @IsOptional()
  @IsDateString()
  dataInstalacao?: string;

  @IsOptional()
  @IsString()
  @IsIn(['novo', 'usado'])
  condicao?: string;

  @IsOptional()
  @IsString()
  diagnosticoInicial?: string;

  @IsOptional()
  @IsNumber()
  valorAquisicao?: number;
}
