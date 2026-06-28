import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ApplyTemplateToGroupDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
