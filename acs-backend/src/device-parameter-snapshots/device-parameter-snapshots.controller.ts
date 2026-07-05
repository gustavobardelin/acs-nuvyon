import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateDeviceParameterSnapshotDto } from './dto/create-device-parameter-snapshot.dto';
import { DeviceParameterSnapshotsService } from './device-parameter-snapshots.service';

@Controller('device-parameter-snapshots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceParameterSnapshotsController {
  constructor(
    private readonly snapshotsService: DeviceParameterSnapshotsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(@Query('deviceId') deviceId?: string) {
    return this.snapshotsService.list(deviceId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('id') id: string) {
    return this.snapshotsService.get(id);
  }

  @Post(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async create(
    @Param('deviceId') deviceId: string,
    @Body() body: CreateDeviceParameterSnapshotDto,
    @Req() req: any,
  ) {
    return this.snapshotsService.create(deviceId, body, {
      email: req?.user?.email || null,
    });
  }

  @Get(':baseId/diff/:targetId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async diff(
    @Param('baseId') baseId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.snapshotsService.diff(baseId, targetId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async remove(@Param('id') id: string) {
    return this.snapshotsService.remove(id);
  }
}
