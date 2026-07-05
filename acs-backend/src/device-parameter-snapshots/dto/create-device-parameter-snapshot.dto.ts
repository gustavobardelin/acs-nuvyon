import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeviceParameterSnapshotDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
