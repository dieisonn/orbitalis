import { IsBoolean, IsInt, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { MOTIVOS_POR_TIPO, TipoMovimento } from '../calculo-estoque';

const TODOS_MOTIVOS = Array.from(new Set(Object.values(MOTIVOS_POR_TIPO).flat()));

class CamposProduto {
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsString() @MaxLength(5000) descricao?: string;
  @IsOptional() @IsString() @MaxLength(60) codigoInterno?: string;
  @IsOptional() @IsString() @MaxLength(60) codigoBarras?: string;
  @IsOptional() @IsString() @MaxLength(100) marca?: string;
  @IsOptional() @IsString() @MaxLength(80) categoria?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unidade?: string;
  @IsOptional() @IsString() @MaxLength(10) ncm?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) precoCusto?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) precoVenda?: number;
  @IsOptional() @IsBoolean() controlaEstoque?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(99_999_999) estoqueMinimo?: number;
  @IsOptional() @IsString() @MaxLength(120) localizacao?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(99_999_999) estoqueMaximo?: number;
  @IsOptional() @IsString() @MaxLength(10) cest?: string;
  @IsOptional() @IsInt() @Min(0) @Max(8) origem?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9_999_999) pesoBruto?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9_999_999) pesoLiquido?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) comissaoPercentual?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) despesasAcessorias?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) outrasDespesas?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9_999_999) largura?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9_999_999) altura?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9_999_999) comprimento?: number;
  @IsOptional() @IsString() @MaxLength(20) codBeneficio?: string;
  // null/'' = sem fornecedor padrão
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsUUID() fornecedorPadraoId?: string | null;
}

export class CreateProdutoDto extends CamposProduto {
  @IsString() @MinLength(2) @MaxLength(255) nome: string;
  // Saldo que já existe na prateleira hoje; vira a primeira linha do histórico
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(99_999_999) saldoInicial?: number;
}

export class UpdateProdutoDto extends CamposProduto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) nome?: string;
}

export class MovimentarEstoqueDto {
  @IsIn(['entrada', 'saida', 'ajuste']) tipo: TipoMovimento;
  // entrada/saída: quantidade movimentada · ajuste: o saldo contado (novo saldo)
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(99_999_999) quantidade: number;
  @IsOptional() @IsIn(TODOS_MOTIVOS) motivo?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) custoUnitario?: number;
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsUUID() fornecedorId?: string;
  @IsOptional() @IsString() @MaxLength(60) documento?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacao?: string;
}
