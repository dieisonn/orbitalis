import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class FiltroSelecaoDto {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(80) categoria?: string;
  @IsOptional() @IsString() @MaxLength(10) ativo?: string;
  @IsOptional() @IsString() @MaxLength(20) situacao?: string;
}

export class SelecaoDto {
  // ids marcados na tela, ou filtro = "todos os resultados da busca"
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsUUID('all', { each: true }) ids?: string[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => FiltroSelecaoDto) filtro?: FiltroSelecaoDto;
}

export const ACOES_LOTE = ['markup', 'ajuste_preco', 'ativar', 'inativar', 'categoria', 'excluir'] as const;
export type AcaoLote = (typeof ACOES_LOTE)[number];

export class LoteDto extends SelecaoDto {
  @IsIn(ACOES_LOTE as unknown as string[]) acao: AcaoLote;
  // markup: se vier, usa este % para todos; senão usa a regra do grupo / o markup padrão
  // ajuste_preco: % a somar ao preço de venda (negativo reduz)
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(-99) @Max(10000) percentual?: number;
  // categoria: novo grupo ('' limpa)
  @IsOptional() @IsString() @MaxLength(80) categoria_nova?: string;
}

export class MarkupItemDto {
  @IsString() @MaxLength(80) categoria: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000) percentual: number;
}

export class SalvarMarkupDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000) padrao: number;
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => MarkupItemDto) categorias: MarkupItemDto[];
}
