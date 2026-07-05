import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { DeviceParameterSnapshot } from './entities/device-parameter-snapshot.entity';
import { DeviceParameterSnapshotsController } from './device-parameter-snapshots.controller';
import { DeviceParameterSnapshotsService } from './device-parameter-snapshots.service';

@Module({
  imports: [DevicesModule, TypeOrmModule.forFeature([DeviceParameterSnapshot])],
  controllers: [DeviceParameterSnapshotsController],
  providers: [DeviceParameterSnapshotsService],
  exports: [DeviceParameterSnapshotsService],
})
export class DeviceParameterSnapshotsModule {}
