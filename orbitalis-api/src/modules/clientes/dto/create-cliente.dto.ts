import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @Length(11, 14)
  documento: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;
}
