import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsObject, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

export class FiltroSimplesDto {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(10) ativo?: string;
}

/** Itens marcados na tela (ids) ou "todos os resultados da busca" (filtro). */
export class SelecaoSimplesDto {
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsUUID('all', { each: true }) ids?: string[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => FiltroSimplesDto) filtro?: FiltroSimplesDto;
}
