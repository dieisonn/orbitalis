import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  crea?: string;
}
