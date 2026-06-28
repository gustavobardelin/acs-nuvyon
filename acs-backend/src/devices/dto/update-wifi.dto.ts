// acs-backend/src/devices/dto/update-wifi.dto.ts

import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWifiDto {
  @IsString()
  instance: string;

  @IsOptional()
  @IsString()
  ssid?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha do Wi-Fi deve possuir no mínimo 8 caracteres.' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['TR-098', 'TR-181', 'TR-098/TR-181', 'DESCONHECIDO'])
  standard?: 'TR-098' | 'TR-181' | 'TR-098/TR-181' | 'DESCONHECIDO';
}