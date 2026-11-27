import { SelecaoSimplesDto } from '../../../common/dto/selecao.dto';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

class CamposServico {
  @IsOptional() @IsString() @MaxLength(5000) descricao?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unidade?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) valor?: number;
  @IsOptional() @IsString() @MaxLength(60) codigo?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) valorCusto?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) comissaoPercentual?: number;
  @IsOptional() @IsString() @MaxLength(120) atividadeServico?: string;
  @IsOptional() @IsString() @MaxLength(20) nbs?: string;
  // null/'' = sem vínculo com tipo de serviço da agenda
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsUUID() tipoServicoId?: string | null;
}

export class CreateServicoDto extends CamposServico {
  @IsString() @MinLength(2) @MaxLength(255) nome: string;
}

export class UpdateServicoDto extends CamposServico {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) nome?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export const ACOES_LOTE_SERVICO = ['ativar', 'inativar', 'excluir', 'ajuste_preco', 'markup', 'atividade'] as const;
export class LoteServicoDto extends SelecaoSimplesDto {
  @IsIn(ACOES_LOTE_SERVICO as unknown as string[]) acao: (typeof ACOES_LOTE_SERVICO)[number];
  // ajuste_preco: % somado ao valor de venda (negativo reduz) · markup: % sobre o custo (vazio = markup padrão geral)
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(-99) @Max(10000) percentual?: number;
  // atividade: nova atividade de serviço ('' limpa)
  @IsOptional() @IsString() @MaxLength(120) atividade_nova?: string;
}
