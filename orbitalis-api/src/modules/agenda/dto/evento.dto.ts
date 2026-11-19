import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventoDto {
  @IsOptional() @IsString() @MaxLength(200)
  titulo?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  descricao?: string | null;

  @IsOptional() @IsString() @MaxLength(1000)
  local?: string | null;

  @IsDateString()
  inicio: string;

  @IsOptional() @IsDateString()
  fim?: string;

  @IsOptional() @IsBoolean()
  diaInteiro?: boolean;

  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'cor deve ser HEX (#RRGGBB)' })
  cor?: string | null;

  @IsOptional() @IsUUID()
  tecnicoId?: string | null;

  @IsOptional() @IsUUID()
  clienteId?: string | null;

  @IsOptional() @IsUUID()
  tipoServicoId?: string | null;

  // Tipos adicionais (além do principal), no máximo 3
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsUUID('all', { each: true })
  tiposExtrasIds?: string[];

  // Avisos do evento: false = sem avisos; true com lista vazia = avisos padrão da pessoa
  @IsOptional() @IsBoolean()
  avisar?: boolean;

  // Antecedências próprias em minutos (1 min a 24 h), no máximo 5
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(1440, { each: true })
  avisosMinutos?: number[];
}

export class UpdateEventoDto {
  @IsOptional() @IsString() @MaxLength(200)
  titulo?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  descricao?: string | null;

  @IsOptional() @IsString() @MaxLength(1000)
  local?: string | null;

  @IsOptional() @IsDateString()
  inicio?: string;

  @IsOptional() @IsDateString()
  fim?: string;

  @IsOptional() @IsBoolean()
  diaInteiro?: boolean;

  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'cor deve ser HEX (#RRGGBB)' })
  cor?: string | null;

  @IsOptional() @IsUUID()
  tecnicoId?: string | null;

  @IsOptional() @IsUUID()
  clienteId?: string | null;

  @IsOptional() @IsUUID()
  tipoServicoId?: string | null;

  // Tipos adicionais (além do principal), no máximo 3
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsUUID('all', { each: true })
  tiposExtrasIds?: string[];

  // Avisos do evento: false = sem avisos; true com lista vazia = avisos padrão da pessoa
  @IsOptional() @IsBoolean()
  avisar?: boolean;

  // Antecedências próprias em minutos (1 min a 24 h), no máximo 5
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(1440, { each: true })
  avisosMinutos?: number[];
}

export class OcorrenciaDto {
  @IsDateString()
  inicio: string;

  @IsDateString()
  fim: string;
}

/** Evento repetido: os campos do evento + as datas de cada ocorrência (calculadas pela tela). */
export class CriarSerieDto extends CreateEventoDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OcorrenciaDto)
  ocorrencias: OcorrenciaDto[];
}
