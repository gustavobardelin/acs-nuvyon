import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GenieACSModule } from './genieacs/genieacs.module';
import { DevicesModule } from './devices/devices.module';
import { ProvisioningTemplatesModule } from './provisioning-templates/provisioning-templates.module';
import { DeviceGroupsModule } from './device-groups/device-groups.module';
import { DeviceAlertsModule } from './device-alerts/device-alerts.module';
import { DeviceMetadataModule } from './device-metadata/device-metadata.module';
import { DeviceParametersModule } from './device-parameters/device-parameters.module';
import { ProvisioningJobsModule } from './provisioning-jobs/provisioning-jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, 
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    GenieACSModule,
    DevicesModule,
    ProvisioningTemplatesModule,
    DeviceGroupsModule,
    DeviceAlertsModule,
    DeviceMetadataModule,
    DeviceParametersModule,
    ProvisioningJobsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
