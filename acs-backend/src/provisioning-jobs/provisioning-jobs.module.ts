import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceGroupsModule } from '../device-groups/device-groups.module';
import { ProvisioningTemplatesModule } from '../provisioning-templates/provisioning-templates.module';
import { ProvisioningJob } from './entities/provisioning-job.entity';
import { ProvisioningJobsController } from './provisioning-jobs.controller';
import { ProvisioningJobsService } from './provisioning-jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProvisioningJob]),
    DeviceGroupsModule,
    ProvisioningTemplatesModule,
  ],
  controllers: [ProvisioningJobsController],
  providers: [ProvisioningJobsService],
  exports: [ProvisioningJobsService],
})
export class ProvisioningJobsModule {}
