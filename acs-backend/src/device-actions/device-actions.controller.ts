// acs-backend/src/device-actions/device-actions.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DeviceActionsService } from './device-actions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('device-actions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceActionsController {
  constructor(private readonly deviceActionsService: DeviceActionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async listActions(
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit || 30);

    if (deviceId) {
      return this.deviceActionsService.findByDeviceId(deviceId, parsedLimit);
    }

    return this.deviceActionsService.findRecent(parsedLimit);
  }
}
