// acs-backend/src/device-actions/device-actions.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceActionsController } from './device-actions.controller';
import { DeviceActionsService } from './device-actions.service';
import { DeviceAction } from './entities/device-action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceAction])],
  controllers: [DeviceActionsController],
  providers: [DeviceActionsService],
  exports: [DeviceActionsService],
})
export class DeviceActionsModule {}
