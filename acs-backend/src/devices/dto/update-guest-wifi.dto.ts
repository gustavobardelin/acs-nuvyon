// acs-backend/src/devices/dto/update-guest-wifi.dto.ts

import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateGuestWifiDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  ssid2g?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ssid5g?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'A senha do Guest Wi-Fi deve possuir no mínimo 8 caracteres.',
  })
  @MaxLength(63)
  password?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  hideSsid?: boolean;

  @IsOptional()
  @IsBoolean()
  isolation?: boolean;
}
