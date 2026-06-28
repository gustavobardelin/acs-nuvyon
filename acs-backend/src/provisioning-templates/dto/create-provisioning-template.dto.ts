// acs-backend/src/provisioning-templates/dto/create-provisioning-template.dto.ts

import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProvisioningTemplateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

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

  @IsArray()
  parameters: Array<{
    path: string;
    value: string | number | boolean;
    type: string;
  }>;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
