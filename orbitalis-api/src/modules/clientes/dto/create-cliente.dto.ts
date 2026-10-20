import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  ValidateIf,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

// Campos de contato/localização comuns ao cadastro e à edição
class ContatoClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;

  // vazio é aceito (limpa o campo)
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cidade?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsString()
  @Length(2, 2)
  uf?: string;
}

export class CreateClienteDto extends ContatoClienteDto {
  // CPF/CNPJ é opcional: clientes antigos podem não ter o documento à mão
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsString()
  @Length(11, 14)
  documento?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  razaoSocial: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeFantasia?: string;

  @IsString()
  @MinLength(5)
  endereco: string;
}

export class UpdateClienteDto extends ContatoClienteDto {
  // string vazia limpa o documento
  @IsOptional()
  @IsString()
  @MaxLength(25)
  documento?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  endereco?: string;
}

// Linha da importação em lote (planilhas). Não exige endereço nem documento.
export class ImportarClientesDto {
  @IsArray()
  @ArrayMaxSize(500)
  clientes: Array<{
    documento?: string;
    razaoSocial: string;
    nomeFantasia?: string;
    endereco?: string;
    telefone?: string;
    celular?: string;
    email?: string;
    cidade?: string;
    uf?: string;
  }>;
}
