import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceActionsService } from '../device-actions/device-actions.service';
import {
  DeviceActionMethod,
  DeviceActionType,
} from '../device-actions/entities/device-action.entity';
import { DevicesService } from '../devices/devices.service';
import { ProvisioningTemplatesService } from '../provisioning-templates/provisioning-templates.service';
import { CreateDeviceGroupDto } from './dto/create-device-group.dto';
import { UpdateDeviceGroupDto } from './dto/update-device-group.dto';
import {
  DeviceGroup,
  DeviceGroupFilters,
} from './entities/device-group.entity';

@Injectable()
export class DeviceGroupsService {
  constructor(
    @InjectRepository(DeviceGroup)
    private readonly groupsRepository: Repository<DeviceGroup>,
    private readonly devicesService: DevicesService,
    private readonly templatesService: ProvisioningTemplatesService,
    private readonly deviceActionsService: DeviceActionsService,
  ) {}

  async findAll(includeInactive = true): Promise<DeviceGroup[]> {
    return this.groupsRepository.find({
      where: includeInactive ? {} : { status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<DeviceGroup> {
    const group = await this.groupsRepository.findOne({ where: { id } });

    if (!group) {
      throw new NotFoundException('Grupo de dispositivos não encontrado.');
    }

    return group;
  }

  async create(
    dto: CreateDeviceGroupDto,
    createdByEmail?: string | null,
  ): Promise<DeviceGroup> {
    const group = this.groupsRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      filters: this.normalizeFilters(dto.filters),
      tags: this.normalizeTags(dto.tags),
      status: 'active',
      createdByEmail: createdByEmail || null,
    });

    return this.groupsRepository.save(group);
  }

  async update(id: string, dto: UpdateDeviceGroupDto): Promise<DeviceGroup> {
    const group = await this.findOne(id);

    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.description !== undefined) {
      group.description = dto.description?.trim() || null;
    }
    if (dto.filters !== undefined) {
      group.filters = this.normalizeFilters(dto.filters);
    }
    if (dto.tags !== undefined) {
      group.tags = this.normalizeTags(dto.tags);
    }
    if (dto.status !== undefined) {
      group.status = dto.status;
    }

    return this.groupsRepository.save(group);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const group = await this.findOne(id);
    await this.groupsRepository.remove(group);
    return { deleted: true };
  }

  async previewDevices(groupId: string, limit = 100) {
    const group = await this.findOne(groupId);
    const normalizedLimit = this.normalizeLimit(limit, 500);
    const devices = await this.getMatchingDevices(group, normalizedLimit);

    return {
      groupId: group.id,
      groupName: group.name,
      filters: group.filters,
      matchedCount: devices.length,
      limit: normalizedLimit,
      devices: devices.map((device) => this.devicePreview(device)),
    };
  }

  async applyTemplateToGroup(input: {
    groupId: string;
    templateId: string;
    limit?: number;
    dryRun?: boolean;
    actor: {
      userId: string | null;
      email: string | null;
    };
  }) {
    const group = await this.findOne(input.groupId);
    const template = await this.templatesService.findOne(input.templateId);

    if (group.status !== 'active') {
      throw new BadRequestException('Este grupo está inativo.');
    }

    if (template.status !== 'active') {
      throw new BadRequestException('Este template está inativo.');
    }

    const limit = this.normalizeLimit(input.limit || 20, 100);
    const devices = await this.getMatchingDevices(group, limit);
    const preview = devices.map((device) => this.devicePreview(device));

    if (input.dryRun !== false) {
      return {
        dryRun: true,
        groupId: group.id,
        groupName: group.name,
        templateId: template.id,
        templateName: template.name,
        matchedCount: preview.length,
        limit,
        devices: preview,
      };
    }

    const results: Array<{
      deviceId: string;
      status: 'SUCCESS' | 'FAILED';
      actionId?: string;
      errorMessage?: string;
    }> = [];

    for (const device of devices) {
      const action = await this.deviceActionsService.startAction({
        deviceId: device.id,
        actionType: DeviceActionType.SET_PARAMETER_VALUES,
        actionLabel: `Aplicar template no grupo ${group.name}: ${template.name}`,
        method: DeviceActionMethod.CONNECTION_REQUEST,
        requestedByUserId: input.actor.userId,
        requestedByEmail: input.actor.email,
        requestPayload: {
          groupId: group.id,
          groupName: group.name,
          templateId: template.id,
          templateName: template.name,
          parameterCount: template.parameters.length,
          bulk: true,
          groupFilters: group.filters,
        },
      });

      try {
        const task = await this.templatesService.applyTemplate(
          template.id,
          device.id,
        );

        await this.deviceActionsService.markSuccess(action.id, {
          task,
          groupId: group.id,
          templateId: template.id,
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
      groupId: group.id,
      groupName: group.name,
      templateId: template.id,
      templateName: template.name,
      matchedCount: devices.length,
      successCount,
      failedCount,
      results,
    };
  }

  private async getMatchingDevices(group: DeviceGroup, limit: number) {
    const devices = await this.devicesService.findAll();

    return devices
      .filter((device) => this.deviceMatchesFilters(device, group.filters || {}))
      .slice(0, limit);
  }

  private deviceMatchesFilters(device: any, filters: DeviceGroupFilters): boolean {
    const manufacturer = this.normalize(filters.manufacturer);
    const model = this.normalize(filters.model);
    const productClass = this.normalize(filters.productClass);
    const search = this.normalize(filters.search);

    if (manufacturer) {
      const deviceManufacturer = this.normalize(device.manufacturer);
      if (!deviceManufacturer.includes(manufacturer)) return false;
    }

    if (model) {
      const deviceModel = this.normalize(device.model);
      const deviceProductClass = this.normalize(device.productClass);

      const modelMatches =
        deviceModel.includes(model) ||
        model.includes(deviceModel) ||
        deviceProductClass.includes(model);

      if (!modelMatches) return false;
    }

    if (productClass) {
      const deviceProductClass = this.normalize(device.productClass);

      const productClassMatches =
        deviceProductClass.includes(productClass) ||
        productClass.includes(deviceProductClass);

      if (!productClassMatches) return false;
    }

    if (filters.status && device.status !== filters.status) {
      return false;
    }

    if (search) {
      const haystack = [
        device.id,
        device.serialNumber,
        device.ip,
        device.lanIp,
        device.pppoeUsername,
        device.model,
        device.productClass,
        device.manufacturer,
      ]
        .map((item) => this.normalize(item))
        .join(' ');

      if (!haystack.includes(search)) return false;
    }

    return true;
  }

  private normalizeFilters(filters: DeviceGroupFilters = {}): DeviceGroupFilters {
    return {
      manufacturer: filters.manufacturer?.trim() || undefined,
      model: filters.model?.trim() || undefined,
      productClass: filters.productClass?.trim() || undefined,
      status: filters.status || undefined,
      search: filters.search?.trim() || undefined,
    };
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!Array.isArray(tags)) return [];

    return Array.from(
      new Set(
        tags
          .map((tag) => String(tag || '').trim())
          .filter((tag) => tag.length > 0),
      ),
    );
  }

  private normalize(value: any): string {
    return String(value || '').trim().toLowerCase();
  }

  private normalizeLimit(limit: number, max: number): number {
    const parsed = Number(limit || 20);

    if (!Number.isFinite(parsed)) return 20;
    if (parsed < 1) return 1;
    if (parsed > max) return max;

    return Math.floor(parsed);
  }

  private devicePreview(device: any) {
    return {
      id: device.id,
      manufacturer: device.manufacturer,
      model: device.model,
      productClass: device.productClass,
      serialNumber: device.serialNumber,
      ip: device.ip,
      lanIp: device.lanIp,
      status: device.status,
      lastContact: device.lastContact,
    };
  }
}
