import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDeviceGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  filters?: {
    manufacturer?: string;
    model?: string;
    productClass?: string;
    status?: 'online' | 'warning' | 'offline';
    search?: string;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
