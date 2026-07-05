import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateDeviceAlertDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  silencedUntil?: string;
}
