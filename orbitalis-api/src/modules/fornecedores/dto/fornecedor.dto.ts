import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength, ValidateIf } from 'class-validator';

class CamposFornecedor {
  @IsOptional() @IsIn(['F', 'J']) tipoPessoa?: 'F' | 'J';
  @IsOptional() @IsString() @MaxLength(255) nomeFantasia?: string;
  @IsOptional() @IsString() @MaxLength(18) cpfCnpj?: string;
  @IsOptional() @IsString() @MaxLength(30) inscricaoEstadual?: string;
  // vazio é aceito (limpa o campo)
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(30) telefone?: string;
  @IsOptional() @IsString() @MaxLength(30) celular?: string;
  @IsOptional() @IsString() @MaxLength(120) contato?: string;
  @IsOptional() @IsString() @MaxLength(9) cep?: string;
  @IsOptional() @IsString() @MaxLength(255) logradouro?: string;
  @IsOptional() @IsString() @MaxLength(20) numeroEndereco?: string;
  @IsOptional() @IsString() @MaxLength(120) complemento?: string;
  @IsOptional() @IsString() @MaxLength(120) bairro?: string;
  @IsOptional() @IsString() @MaxLength(120) cidade?: string;
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsString() @Length(2, 2) uf?: string;
  @IsOptional() @IsString() @MaxLength(5000) observacoes?: string;
}

export class CreateFornecedorDto extends CamposFornecedor {
  @IsString() @MinLength(2) @MaxLength(255) razaoSocial: string;
}

export class UpdateFornecedorDto extends CamposFornecedor {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) razaoSocial?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
