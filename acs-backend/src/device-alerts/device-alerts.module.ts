import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { DeviceMetadataModule } from '../device-metadata/device-metadata.module';
import { DeviceAlertState } from './entities/device-alert-state.entity';
import { DeviceAlertsController } from './device-alerts.controller';
import { DeviceAlertsService } from './device-alerts.service';

@Module({
  imports: [
    DevicesModule,
    DeviceMetadataModule,
    TypeOrmModule.forFeature([DeviceAlertState]),
  ],
  controllers: [DeviceAlertsController],
  providers: [DeviceAlertsService],
  exports: [DeviceAlertsService],
})
export class DeviceAlertsModule {}
