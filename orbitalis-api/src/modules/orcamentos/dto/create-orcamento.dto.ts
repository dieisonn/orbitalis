import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateOrcamentoItemDto {
  @IsString() @IsNotEmpty()
  descricao: string;

  @IsOptional() @IsString()
  unidade?: string;

  @IsNotEmpty()
  quantidade: number;

  @IsNotEmpty()
  precoUnitario: number;

  // 'servico' = mão de obra, 'peca' = material. Vira valorMaoObra/valorPecas da O.S. gerada.
  @IsOptional() @IsIn(['servico', 'peca'])
  categoria?: 'servico' | 'peca';

  // Item escolhido do cadastro: produto (baixa estoque ao aprovar) ou serviço do catálogo
  @IsOptional() @IsUUID()
  produtoId?: string | null;

  @IsOptional() @IsUUID()
  servicoId?: string | null;
}

export class OrcamentoParcelaDto {
  @IsDateString()
  vencimento: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999)
  valor: number;
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

  // ── Como a O.S. será gerada quando o orçamento for aprovado ──
  @IsOptional() @IsUUID()
  ambienteId?: string | null;

  @IsOptional() @IsIn(['preventiva', 'corretiva'])
  tipoOs?: 'preventiva' | 'corretiva';

  @IsOptional() @IsUUID()
  tipoServicoId?: string | null;

  // Checklist da O.S.; se omitido, o sistema sugere pelo tipo e pelo tipo de serviço
  @IsOptional() @IsUUID()
  modeloChecklistId?: string | null;

  // Visita (O.S. do mesmo cliente) que originou o orçamento — alimenta o funil de conversão
  @IsOptional() @IsUUID()
  visitaOrigemId?: string | null;

  @IsOptional() @IsIn(['valor', 'percentual'])
  descontoTipo?: 'valor' | 'percentual';

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999)
  desconto?: number;

  // Frete / outras despesas somadas ao total
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999)
  frete?: number;

  @IsOptional() @IsString() @MaxLength(60)
  formaPagamento?: string;

  // Anotações da equipe: não vão para o PDF nem para o link do cliente
  @IsOptional() @IsString() @MaxLength(5000)
  observacoesInternas?: string;

  // Informativas: a soma precisa bater com o total do orçamento
  @IsOptional() @IsArray() @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => OrcamentoParcelaDto)
  parcelas?: OrcamentoParcelaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrcamentoItemDto)
  itens: CreateOrcamentoItemDto[];
}

export class AlterarStatusOrcamentoDto {
  @IsIn(['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'])
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado';
}

export class AnexoOrcamentoDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  nome: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  tipo: string;

  // até 3 MB de arquivo (≈ 4,2 milhões de caracteres em base64)
  @IsString() @IsNotEmpty() @MaxLength(4_200_000)
  conteudoBase64: string;
}
