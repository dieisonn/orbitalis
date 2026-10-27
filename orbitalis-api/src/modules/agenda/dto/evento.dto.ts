import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

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
}
