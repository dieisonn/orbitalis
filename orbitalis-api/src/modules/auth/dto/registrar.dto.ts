import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegistrarDto {
  @IsString()
  nomeEmpresa: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug deve conter apenas letras minúsculas, números e hífens' })
  slug: string;

  @IsString()
  nomeAdmin: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  senha: string;
}
