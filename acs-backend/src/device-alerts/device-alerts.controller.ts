import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateDeviceAlertDto } from './dto/update-device-alert.dto';
import { DeviceAlertsService } from './device-alerts.service';

@Controller('device-alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceAlertsController {
  constructor(private readonly alertsService: DeviceAlertsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.alertsService.findAll({
      severity:
        severity === 'critical' || severity === 'warning' || severity === 'info'
          ? severity
          : undefined,
      status:
        status === 'OPEN' ||
        status === 'ACKNOWLEDGED' ||
        status === 'SILENCED' ||
        status === 'RESOLVED'
          ? status
          : undefined,
      category,
      q,
      includeResolved: includeResolved === 'true',
    });
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async summary() {
    return this.alertsService.summary();
  }

  @Patch(':id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async acknowledge(
    @Param('id') id: string,
    @Body() body: UpdateDeviceAlertDto,
    @Req() req: any,
  ) {
    return this.alertsService.acknowledge(id, this.getActor(req), body.note);
  }

  @Patch(':id/silence')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async silence(
    @Param('id') id: string,
    @Body() body: UpdateDeviceAlertDto,
    @Req() req: any,
  ) {
    return this.alertsService.silence(
      id,
      this.getActor(req),
      body.reason || body.note,
      body.silencedUntil,
    );
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async resolve(
    @Param('id') id: string,
    @Body() body: UpdateDeviceAlertDto,
    @Req() req: any,
  ) {
    return this.alertsService.resolve(id, this.getActor(req), body.note);
  }

  @Patch(':id/reopen')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async reopen(@Param('id') id: string) {
    return this.alertsService.reopen(id);
  }

  private getActor(req: any): { email: string | null } {
    const user = req?.user || {};

    return {
      email: user.email || null,
    };
  }
}
