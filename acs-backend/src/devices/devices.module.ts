// acs-backend/src/devices/devices.module.ts

import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { GenieACSModule } from '../genieacs/genieacs.module';
import { DeviceActionsModule } from '../device-actions/device-actions.module';

@Module({
  imports: [GenieACSModule, DeviceActionsModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
