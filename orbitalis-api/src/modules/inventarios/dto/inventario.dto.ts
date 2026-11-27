import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

export class CreateInventarioDto {
  @IsOptional() @IsString() @MaxLength(120) titulo?: string;
  @IsOptional() @IsString() @MaxLength(80) categoria?: string;
  @IsOptional() @IsString() @MaxLength(120) localizacao?: string;
  // padrão: inclui produtos com saldo zero (podem existir na prateleira sem registro)
  @IsOptional() @IsBoolean() incluirZerados?: boolean;
  @IsOptional() @IsBoolean() contagemCega?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;
}

export class ItemContagemDto {
  @IsUUID() itemId: string;
  // null desfaz a contagem do item
  @ValidateIf((_, v) => v !== null) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(99_999_999) contado: number | null;
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
}

export class ContagemDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => ItemContagemDto)
  itens: ItemContagemDto[];
}

export class ConcluirInventarioDto {
  // o que fazer com itens que ninguém contou: manter o saldo atual ou considerar zero
  @IsOptional() @IsIn(['manter', 'zerar']) naoContados?: 'manter' | 'zerar';
}
