import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrcamentoItemDto)
  itens: CreateOrcamentoItemDto[];
}
