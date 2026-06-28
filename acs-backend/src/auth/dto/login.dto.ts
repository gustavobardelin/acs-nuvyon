// acs-backend/src/auth/dto/login.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'E-mail é obrigatório.' })
  email: string;

  @IsString({ message: 'Senha inválida.' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  @MinLength(1, { message: 'Senha é obrigatória.' })
  password: string;
}