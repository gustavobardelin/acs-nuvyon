import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceMetadataController } from './device-metadata.controller';
import { DeviceMetadataService } from './device-metadata.service';
import { DeviceMetadata } from './entities/device-metadata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceMetadata])],
  controllers: [DeviceMetadataController],
  providers: [DeviceMetadataService],
  exports: [DeviceMetadataService],
})
export class DeviceMetadataModule {}
