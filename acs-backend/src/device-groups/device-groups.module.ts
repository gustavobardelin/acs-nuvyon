import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceActionsModule } from '../device-actions/device-actions.module';
import { DevicesModule } from '../devices/devices.module';
import { ProvisioningTemplatesModule } from '../provisioning-templates/provisioning-templates.module';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupsController } from './device-groups.controller';
import { DeviceGroupsService } from './device-groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceGroup]),
    DevicesModule,
    ProvisioningTemplatesModule,
    DeviceActionsModule,
  ],
  controllers: [DeviceGroupsController],
  providers: [DeviceGroupsService],
  exports: [DeviceGroupsService],
})
export class DeviceGroupsModule {}
