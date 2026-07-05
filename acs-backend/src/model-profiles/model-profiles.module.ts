import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { ModelProfile } from './entities/model-profile.entity';
import { ModelProfilesController } from './model-profiles.controller';
import { ModelProfilesService } from './model-profiles.service';

@Module({
  imports: [DevicesModule, TypeOrmModule.forFeature([ModelProfile])],
  controllers: [ModelProfilesController],
  providers: [ModelProfilesService],
  exports: [ModelProfilesService],
})
export class ModelProfilesModule {}
