import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  // só quando o e-mail pertence a mais de uma empresa
  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
