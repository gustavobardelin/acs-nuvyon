import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelProfile } from './entities/model-profile.entity';
import { ModelProfilesController } from './model-profiles.controller';
import { ModelProfilesService } from './model-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelProfile])],
  controllers: [ModelProfilesController],
  providers: [ModelProfilesService],
  exports: [ModelProfilesService],
})
export class ModelProfilesModule {}
