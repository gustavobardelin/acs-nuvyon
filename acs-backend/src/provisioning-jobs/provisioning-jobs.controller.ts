import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { RunProvisioningJobDto } from './dto/run-provisioning-job.dto';
import { ProvisioningJobsService } from './provisioning-jobs.service';

@Controller('provisioning-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvisioningJobsController {
  constructor(private readonly jobsService: ProvisioningJobsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list() {
    return this.jobsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post('preview')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async preview(@Body() body: RunProvisioningJobDto) {
    return this.jobsService.preview(body);
  }

  @Post('run')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async run(@Body() body: RunProvisioningJobDto, @Req() req: any) {
    return this.jobsService.run(body, this.getActor(req));
  }

  private getActor(req: any): { userId: string | null; email: string | null } {
    const user = req?.user || {};

    return {
      userId: user.sub || user.id || null,
      email: user.email || null,
    };
  }
}
