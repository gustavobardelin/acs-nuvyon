import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDeviceGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  filters: {
    manufacturer?: string;
    model?: string;
    productClass?: string;
    status?: 'online' | 'warning' | 'offline';
    search?: string;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];
}
