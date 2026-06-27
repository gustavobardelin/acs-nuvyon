import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { GenieACSModule } from '../genieacs/genieacs.module';

@Module({
  imports: [GenieACSModule], // Injeta a comunicação com o motor TR-069
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}