import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertModelProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  productClass?: string;

  @IsOptional()
  @IsIn(['Device', 'InternetGatewayDevice', 'mixed', 'unknown'])
  rootObject?: string;

  @IsOptional()
  @IsIn(['active', 'draft', 'deprecated'])
  status?: string;

  @IsOptional()
  @IsObject()
  parameterMap?: Record<string, any>;

  @IsOptional()
  @IsObject()
  capabilities?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedTemplates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
