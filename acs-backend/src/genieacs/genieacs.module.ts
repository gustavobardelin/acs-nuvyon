import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GenieACSService } from './genieacs.service';
import genieacsConfig from '../config/genieacs.config';

@Module({
  imports: [
    ConfigModule.forFeature(genieacsConfig),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('genieacs.url') || 'http://localhost:7557',
        timeout: configService.get<number>('genieacs.timeout') || 5000,
        auth: {
          username: configService.get<string>('genieacs.username') || '',
          password: configService.get<string>('genieacs.password') || '',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GenieACSService],
  exports: [GenieACSService],
})
export class GenieACSModule {}