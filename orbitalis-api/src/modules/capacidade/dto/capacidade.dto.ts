import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

/** Jornada da semana: 7 valores em minutos (domingo a sábado). */
export class DefinirSemanaDto {
  @IsArray() @ArrayMinSize(7) @ArrayMaxSize(7)
  @IsInt({ each: true }) @Min(0, { each: true }) @Max(1440, { each: true })
  semana: number[];
}

/** Semana do técnico; `null` volta a usar a jornada padrão da empresa. */
export class DefinirSemanaTecnicoDto {
  @IsOptional() @IsArray() @ArrayMinSize(7) @ArrayMaxSize(7)
  @IsInt({ each: true }) @Min(0, { each: true }) @Max(1440, { each: true })
  semana?: number[] | null;
}

export class CriarAjusteDto {
  @IsUUID() tecnicoId: string;

  // AAAA-MM-DD
  @Matches(/^\d{4}-\d{2}-\d{2}$/) data: string;

  // 0 = folga/férias; outro valor = jornada daquele dia
  @IsInt() @Min(0) @Max(1440) minutos: number;

  @IsOptional() @IsString() @MaxLength(120) motivo?: string;
}
