// acs-backend/src/provisioning-templates/dto/update-provisioning-template.dto.ts

import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProvisioningTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  productClass?: string;

  @IsOptional()
  @IsArray()
  parameters?: Array<{
    path: string;
    value: string | number | boolean;
    type: string;
  }>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
