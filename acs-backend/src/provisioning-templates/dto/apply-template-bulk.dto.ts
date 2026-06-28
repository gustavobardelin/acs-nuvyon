// acs-backend/src/provisioning-templates/dto/apply-template-bulk.dto.ts

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ApplyTemplateBulkDto {
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  productClass?: string;

  @IsOptional()
  @IsIn(['online', 'warning', 'offline'])
  status?: 'online' | 'warning' | 'offline';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
