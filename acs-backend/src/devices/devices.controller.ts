// acs-backend/src/devices/devices.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateWifiDto } from './dto/update-wifi.dto';
import { UpdateGuestWifiDto } from './dto/update-guest-wifi.dto';
import { DeviceActionsService } from '../device-actions/device-actions.service';
import {
  DeviceActionMethod,
  DeviceActionType,
} from '../device-actions/entities/device-action.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly deviceActionsService: DeviceActionsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async getAllDevices(@Query('q') query?: string) {
    return this.devicesService.findAll(query);
  }

  @Get(':id/connection-request')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async getConnectionRequest(@Param('id') id: string) {
    return this.devicesService.getConnectionRequest(id);
  }

  @Post(':id/connection-request/test')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async testConnectionRequest(@Param('id') id: string, @Req() req: any) {
    const actor = this.getActor(req);

    const action = await this.deviceActionsService.startAction({
      deviceId: id,
      actionType: DeviceActionType.TEST_CONNECTION_REQUEST,
      actionLabel: 'Teste de Connection Request',
      method: DeviceActionMethod.DIRECT_HTTP_TEST,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        deviceId: id,
      },
    });

    try {
      const result = await this.devicesService.testConnectionRequest(id);

      await this.deviceActionsService.markSuccess(action.id, result, result.statusCode);

      return {
        ...result,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async getDeviceById(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Post(':id/reboot')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async rebootDevice(@Param('id') id: string, @Req() req: any) {
    const actor = this.getActor(req);

    const action = await this.deviceActionsService.startAction({
      deviceId: id,
      actionType: DeviceActionType.REBOOT,
      actionLabel: 'Reboot',
      method: DeviceActionMethod.CONNECTION_REQUEST,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        deviceId: id,
        useConnectionRequest: true,
      },
    });

    try {
      const task = await this.devicesService.reboot(id);

      await this.deviceActionsService.markSuccess(action.id, {
        task,
      });

      return {
        message: 'Comando de reboot enfileirado com sucesso',
        taskId: task,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  @Post(':id/refresh')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async refreshDevice(
    @Param('id') id: string,
    @Body('objectName') objectName: string | undefined,
    @Req() req: any,
  ) {
    const actor = this.getActor(req);
    const normalizedObjectName = objectName || '';

    const action = await this.deviceActionsService.startAction({
      deviceId: id,
      actionType: DeviceActionType.REFRESH_OBJECT,
      actionLabel: normalizedObjectName
        ? `Refresh ${normalizedObjectName}`
        : 'Refresh geral',
      method: DeviceActionMethod.CONNECTION_REQUEST,
      objectName: normalizedObjectName,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        deviceId: id,
        objectName: normalizedObjectName,
        useConnectionRequest: true,
      },
    });

    try {
      const task = await this.devicesService.refresh(id, normalizedObjectName);

      await this.deviceActionsService.markSuccess(action.id, {
        task,
      });

      return {
        message: 'Comando de atualização de parâmetros enfileirado',
        taskId: task,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  @Post(':id/guest-wifi')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async updateGuestWifi(
    @Param('id') id: string,
    @Body() body: UpdateGuestWifiDto,
    @Req() req: any,
  ) {
    const actor = this.getActor(req);

    const action = await this.deviceActionsService.startAction({
      deviceId: id,
      actionType: DeviceActionType.UPDATE_WIFI,
      actionLabel: 'Alteração Guest Wi-Fi',
      method: DeviceActionMethod.CONNECTION_REQUEST,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        deviceId: id,
        ssid2g: body.ssid2g || null,
        ssid5g: body.ssid5g || null,
        enabled: body.enabled ?? null,
        hideSsid: body.hideSsid ?? null,
        isolation: body.isolation ?? null,
        passwordChanged: Boolean(body.password),
      },
    });

    try {
      const task = await this.devicesService.updateGuestWifi({
        deviceId: id,
        ssid2g: body.ssid2g,
        ssid5g: body.ssid5g,
        password: body.password,
        enabled: body.enabled,
        hideSsid: body.hideSsid,
        isolation: body.isolation,
      });

      await this.deviceActionsService.markSuccess(action.id, {
        task,
      });

      return {
        message: 'Configuração Guest Wi-Fi enviada com sucesso',
        taskId: task,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  @Post(':id/wifi')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async updateWifi(
    @Param('id') id: string,
    @Body() body: UpdateWifiDto,
    @Req() req: any,
  ) {
    const actor = this.getActor(req);

    const action = await this.deviceActionsService.startAction({
      deviceId: id,
      actionType: DeviceActionType.UPDATE_WIFI,
      actionLabel: 'Alteração de Wi-Fi',
      method: DeviceActionMethod.CONNECTION_REQUEST,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        deviceId: id,
        instance: body.instance,
        ssid: body.ssid || null,
        enabled: body.enabled ?? null,
        standard: body.standard || null,
        passwordChanged: Boolean(body.password),
      },
    });

    try {
      const task = await this.devicesService.updateWifi({
        deviceId: id,
        instance: body.instance,
        ssid: body.ssid,
        password: body.password,
        enabled: body.enabled,
        standard: body.standard,
      });

      await this.deviceActionsService.markSuccess(action.id, {
        task,
      });

      return {
        message: 'Comando de alteração de Wi-Fi enfileirado com sucesso',
        taskId: task,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  private getActor(req: any): { userId: string | null; email: string | null } {
    const user = req?.user || {};

    return {
      userId: user.sub || user.id || null,
      email: user.email || null,
    };
  }
}
