import { IsDefined, IsOptional, IsString } from 'class-validator';

export class SetDeviceParameterDto {
  @IsString()
  path: string;

  @IsDefined()
  value: string | number | boolean;

  @IsOptional()
  @IsString()
  type?: string;
}

export class RefreshDeviceObjectDto {
  @IsOptional()
  @IsString()
  objectName?: string;
}
