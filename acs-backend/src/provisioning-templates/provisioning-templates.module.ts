// acs-backend/src/provisioning-templates/provisioning-templates.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceActionsModule } from '../device-actions/device-actions.module';
import { DevicesModule } from '../devices/devices.module';
import { ProvisioningTemplate } from './entities/provisioning-template.entity';
import { ProvisioningTemplatesController } from './provisioning-templates.controller';
import { ProvisioningTemplatesService } from './provisioning-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProvisioningTemplate]),
    DevicesModule,
    DeviceActionsModule,
  ],
  controllers: [ProvisioningTemplatesController],
  providers: [ProvisioningTemplatesService],
  exports: [ProvisioningTemplatesService],
})
export class ProvisioningTemplatesModule {}
