// acs-backend/src/provisioning-templates/provisioning-templates.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DeviceActionsService } from '../device-actions/device-actions.service';
import {
  DeviceActionMethod,
  DeviceActionType,
} from '../device-actions/entities/device-action.entity';
import { CreateProvisioningTemplateDto } from './dto/create-provisioning-template.dto';
import { UpdateProvisioningTemplateDto } from './dto/update-provisioning-template.dto';
import { ApplyTemplateBulkDto } from './dto/apply-template-bulk.dto';
import { ProvisioningTemplatesService } from './provisioning-templates.service';
import { DevicesService } from '../devices/devices.service';

@Controller('provisioning-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvisioningTemplatesController {
  constructor(
    private readonly templatesService: ProvisioningTemplatesService,
    private readonly deviceActionsService: DeviceActionsService,
    private readonly devicesService: DevicesService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(
    @Query('q') q?: string,
    @Query('model') model?: string,
    @Query('productClass') productClass?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.templatesService.findAll({
      q,
      model,
      productClass,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async create(@Body() body: CreateProvisioningTemplateDto, @Req() req: any) {
    const actor = this.getActor(req);

    return this.templatesService.create(body, actor.email);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProvisioningTemplateDto,
  ) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/apply-bulk')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async applyBulk(
    @Param('id') templateId: string,
    @Body() body: ApplyTemplateBulkDto,
    @Req() req: any,
  ) {
    const actor = this.getActor(req);
    const template = await this.templatesService.findOne(templateId);

    const limit = this.normalizeBulkLimit(body.limit);
    const model = body.model?.trim().toLowerCase() || '';
    const productClass = body.productClass?.trim().toLowerCase() || '';
    const status = body.status || null;

    const allDevices = await this.devicesService.findAll();

    const matchedDevices = allDevices
      .filter((device) => {
        if (model) {
          const deviceModel = String(device.model || '').toLowerCase();
          const deviceProductClass = String(device.productClass || '').toLowerCase();

          const modelMatches =
            deviceModel.includes(model) ||
            model.includes(deviceModel) ||
            deviceProductClass.includes(model);

          if (!modelMatches) return false;
        }

        if (productClass) {
          const deviceProductClass = String(device.productClass || '').toLowerCase();

          const productClassMatches =
            deviceProductClass.includes(productClass) ||
            productClass.includes(deviceProductClass);

          if (!productClassMatches) return false;
        }

        if (status && device.status !== status) {
          return false;
        }

        return true;
      })
      .slice(0, limit);

    const previewDevices = matchedDevices.map((device) => ({
      id: device.id,
      manufacturer: device.manufacturer,
      model: device.model,
      productClass: device.productClass,
      serialNumber: device.serialNumber,
      ip: device.ip,
      lanIp: device.lanIp,
      status: device.status,
      lastContact: device.lastContact,
    }));

    if (body.dryRun !== false) {
      return {
        dryRun: true,
        templateId,
        templateName: template.name,
        matchedCount: previewDevices.length,
        limit,
        filters: {
          model: body.model || null,
          productClass: body.productClass || null,
          status,
        },
        devices: previewDevices,
      };
    }

    const results: Array<{
      deviceId: string;
      status: 'SUCCESS' | 'FAILED';
      actionId?: string;
      errorMessage?: string;
    }> = [];

    for (const device of matchedDevices) {
      const action = await this.deviceActionsService.startAction({
        deviceId: device.id,
        actionType: DeviceActionType.SET_PARAMETER_VALUES,
        actionLabel: `Aplicar template em lote: ${template.name}`,
        method: DeviceActionMethod.CONNECTION_REQUEST,
        requestedByUserId: actor.userId,
        requestedByEmail: actor.email,
        requestPayload: {
          templateId,
          templateName: template.name,
          bulk: true,
          filters: {
            model: body.model || null,
            productClass: body.productClass || null,
            status,
          },
          parameterCount: template.parameters.length,
        },
      });

      try {
        const task = await this.templatesService.applyTemplate(templateId, device.id);

        await this.deviceActionsService.markSuccess(action.id, {
          task,
          bulk: true,
        });

        results.push({
          deviceId: device.id,
          status: 'SUCCESS',
          actionId: action.id,
        });
      } catch (error: any) {
        await this.deviceActionsService.markFailed(action.id, error);

        results.push({
          deviceId: device.id,
          status: 'FAILED',
          actionId: action.id,
          errorMessage:
            error?.response?.data?.message ||
            error?.message ||
            'Falha ao aplicar template.',
        });
      }
    }

    const successCount = results.filter((item) => item.status === 'SUCCESS').length;
    const failedCount = results.filter((item) => item.status === 'FAILED').length;

    return {
      dryRun: false,
      templateId,
      templateName: template.name,
      matchedCount: matchedDevices.length,
      successCount,
      failedCount,
      results,
    };
  }

  @Post(':id/apply/:deviceId')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async apply(
    @Param('id') templateId: string,
    @Param('deviceId') deviceId: string,
    @Req() req: any,
  ) {
    const actor = this.getActor(req);
    const template = await this.templatesService.findOne(templateId);

    const action = await this.deviceActionsService.startAction({
      deviceId,
      actionType: DeviceActionType.SET_PARAMETER_VALUES,
      actionLabel: `Aplicar template: ${template.name}`,
      method: DeviceActionMethod.CONNECTION_REQUEST,
      requestedByUserId: actor.userId,
      requestedByEmail: actor.email,
      requestPayload: {
        templateId,
        templateName: template.name,
        parameterCount: template.parameters.length,
      },
    });

    try {
      const task = await this.templatesService.applyTemplate(templateId, deviceId);

      await this.deviceActionsService.markSuccess(action.id, {
        task,
      });

      return {
        message: 'Template aplicado com sucesso',
        templateId,
        templateName: template.name,
        taskId: task,
        actionId: action.id,
      };
    } catch (error: any) {
      await this.deviceActionsService.markFailed(action.id, error);
      throw error;
    }
  }

  private normalizeBulkLimit(limit?: number): number {
    const parsed = Number(limit || 20);

    if (!Number.isFinite(parsed)) return 20;
    if (parsed < 1) return 1;
    if (parsed > 100) return 100;

    return Math.floor(parsed);
  }

  private getActor(req: any): { userId: string | null; email: string | null } {
    const user = req?.user || {};

    return {
      userId: user.sub || user.id || null,
      email: user.email || null,
    };
  }
}
