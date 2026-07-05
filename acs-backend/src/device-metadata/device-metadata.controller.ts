import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateDeviceMetadataDto } from './dto/update-device-metadata.dto';
import { DeviceMetadataService } from './device-metadata.service';

@Controller('device-metadata')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceMetadataController {
  constructor(private readonly metadataService: DeviceMetadataService) {}

  @Get(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('deviceId') deviceId: string) {
    return this.metadataService.getByDeviceId(deviceId);
  }

  @Patch(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async update(
    @Param('deviceId') deviceId: string,
    @Body() body: UpdateDeviceMetadataDto,
    @Req() req: any,
  ) {
    return this.metadataService.updateByDeviceId(deviceId, body, {
      email: req?.user?.email || null,
    });
  }
}
