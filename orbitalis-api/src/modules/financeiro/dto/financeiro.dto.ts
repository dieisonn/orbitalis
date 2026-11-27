import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

const vazioParaNull = ({ value }: { value: unknown }) => (value === '' ? null : value);

export class BaixaDto {
  @IsOptional() @IsDateString() pagoEm?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999_999_999.99) valorPago?: number;
  @IsOptional() @IsUUID() contaId?: string;
}

export class CreateLancamentoDto {
  @IsIn(['receber', 'pagar']) tipo!: 'receber' | 'pagar';
  @IsString() @MinLength(2) @MaxLength(255) descricao!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999_999_999.99) valor!: number;
  @IsDateString() vencimento!: string;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() categoriaId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() clienteId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() fornecedorId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() contaId?: string | null;
  @IsOptional() @IsString() @MaxLength(60) documento?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;
  /** Parcelamento: divide o valor total em N lançamentos */
  @IsOptional() @IsInt() @Min(1) @Max(60) parcelas?: number;
  @IsOptional() @IsIn(['mensal', 'quinzenal', 'semanal']) intervalo?: 'mensal' | 'quinzenal' | 'semanal';
  /** Já recebido/pago: cria o lançamento baixado nesta data */
  @IsOptional() @ValidateNested() @Type(() => BaixaDto) baixa?: BaixaDto;
}

export class UpdateLancamentoDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) descricao?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999_999_999.99) valor?: number;
  @IsOptional() @IsDateString() vencimento?: string;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() categoriaId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() clienteId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() fornecedorId?: string | null;
  @IsOptional() @Transform(vazioParaNull) @IsUUID() contaId?: string | null;
  @IsOptional() @IsString() @MaxLength(60) documento?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;
}

export class GerarReceberDto {
  /** Usado quando o orçamento não tem parcelas: vencimento da cobrança única */
  @IsOptional() @IsDateString() vencimento?: string;
  @IsOptional() @IsUUID() categoriaId?: string;
  @IsOptional() @IsUUID() contaId?: string;
}

export class ContaDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) nome?: string;
  @IsOptional() @IsIn(['caixa', 'banco', 'carteira']) tipo?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(-999_999_999.99) @Max(999_999_999.99) saldoInicial?: number;
  @IsOptional() @IsBoolean() ativa?: boolean;
}

export class CategoriaDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) nome?: string;
  @IsOptional() @IsIn(['receita', 'despesa']) tipo?: string;
  @IsOptional() @IsBoolean() ativa?: boolean;
}
