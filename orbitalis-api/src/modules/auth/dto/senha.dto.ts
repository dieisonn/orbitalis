import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class TrocarSenhaDto {
  @IsString() @MaxLength(200)
  senhaAtual!: string;

  @IsString() @MinLength(8, { message: 'A nova senha precisa ter ao menos 8 caracteres' }) @MaxLength(72)
  novaSenha!: string;
}

export class EsqueciSenhaDto {
  @IsEmail() @MaxLength(255)
  email!: string;
}

export class RedefinirSenhaDto {
  @IsString() @Matches(/^[0-9a-f]{64}$/, { message: 'Link inválido' })
  token!: string;

  @IsString() @MinLength(8, { message: 'A nova senha precisa ter ao menos 8 caracteres' }) @MaxLength(72)
  novaSenha!: string;
}
