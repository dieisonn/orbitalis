import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateOrcamentoItemDto {
  @IsString() @IsNotEmpty()
  descricao: string;

  @IsOptional() @IsString()
  unidade?: string;

  @IsNotEmpty()
  quantidade: number;

  @IsNotEmpty()
  precoUnitario: number;
}

export class CreateOrcamentoDto {
  @IsUUID() @IsNotEmpty()
  clienteId: string;

  @IsString() @IsNotEmpty()
  titulo: string;

  @IsOptional() @IsString()
  observacoes?: string;

  @IsOptional() @IsInt() @Min(1)
  validadeDias?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrcamentoItemDto)
  itens: CreateOrcamentoItemDto[];
}
