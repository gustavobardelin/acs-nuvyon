import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DeviceParametersController } from './device-parameters.controller';
import { DeviceParametersService } from './device-parameters.service';

@Module({
  imports: [DevicesModule],
  controllers: [DeviceParametersController],
  providers: [DeviceParametersService],
  exports: [DeviceParametersService],
})
export class DeviceParametersModule {}
