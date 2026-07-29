import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AceitarConviteDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  senha: string;
}
