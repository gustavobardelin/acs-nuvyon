import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  RefreshDeviceObjectDto,
  SetDeviceParameterDto,
} from './dto/set-device-parameter.dto';
import { DeviceParametersService } from './device-parameters.service';

@Controller('device-parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceParametersController {
  constructor(private readonly parametersService: DeviceParametersService) {}

  @Get(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(
    @Param('deviceId') deviceId: string,
    @Query('q') q?: string,
    @Query('writable') writable?: string,
    @Query('limit') limit?: string,
  ) {
    return this.parametersService.findParameters(deviceId, {
      q,
      writable,
      limit,
    });
  }

  @Post(':deviceId/refresh')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async refresh(
    @Param('deviceId') deviceId: string,
    @Body() body: RefreshDeviceObjectDto,
  ) {
    return this.parametersService.refreshObject(
      deviceId,
      body.objectName || 'Device',
    );
  }

  @Post(':deviceId/set')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async setParameter(
    @Param('deviceId') deviceId: string,
    @Body() body: SetDeviceParameterDto,
  ) {
    return this.parametersService.setParameter(deviceId, body);
  }
}
