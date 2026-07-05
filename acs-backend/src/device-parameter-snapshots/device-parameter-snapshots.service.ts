import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { CreateDeviceParameterSnapshotDto } from './dto/create-device-parameter-snapshot.dto';
import {
  DeviceParameterSnapshot,
  DeviceParameterSnapshotItem,
} from './entities/device-parameter-snapshot.entity';

export interface ParameterDiffItem {
  path: string;
  before: DeviceParameterSnapshotItem | null;
  after: DeviceParameterSnapshotItem | null;
  changeType: 'added' | 'removed' | 'changed';
  changedFields: string[];
}

@Injectable()
export class DeviceParameterSnapshotsService {
  constructor(
    private readonly devicesService: DevicesService,
    @InjectRepository(DeviceParameterSnapshot)
    private readonly snapshotsRepository: Repository<DeviceParameterSnapshot>,
  ) {}

  async list(deviceId?: string) {
    return this.snapshotsRepository.find({
      where: deviceId ? { deviceId } : {},
      order: {
        createdAt: 'DESC',
      },
      take: 100,
    });
  }

  async get(id: string) {
    const snapshot = await this.snapshotsRepository.findOne({
      where: { id },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot não encontrado.');
    }

    return snapshot;
  }

  async create(
    deviceId: string,
    dto: CreateDeviceParameterSnapshotDto,
    actor?: { email: string | null },
  ) {
    const rawDevice = await this.devicesService.findRawDeviceById(deviceId);

    const parameters: DeviceParameterSnapshotItem[] = [];
    this.flattenParameters(rawDevice, '', parameters);

    const q = String(dto.q || '').trim().toLowerCase();

    const filteredParameters = parameters
      .filter((parameter) => {
        if (!parameter.path) return false;

        if (!q) return true;

        const haystack = [
          parameter.path,
          parameter.value,
          parameter.type,
          parameter.writable ? 'writable' : 'readonly',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => a.path.localeCompare(b.path));

    const snapshot = this.snapshotsRepository.create({
      deviceId,
      name:
        dto.name?.trim() ||
        `Snapshot ${new Date().toLocaleString('pt-BR')}`,
      description: dto.description?.trim() || null,
      parameterCount: filteredParameters.length,
      parameters: filteredParameters,
      createdByEmail: actor?.email || null,
    });

    return this.snapshotsRepository.save(snapshot);
  }

  async diff(baseId: string, targetId: string) {
    const [base, target] = await Promise.all([
      this.get(baseId),
      this.get(targetId),
    ]);

    const beforeMap = new Map(
      (base.parameters || []).map((parameter) => [parameter.path, parameter]),
    );

    const afterMap = new Map(
      (target.parameters || []).map((parameter) => [parameter.path, parameter]),
    );

    const allPaths = Array.from(
      new Set([...beforeMap.keys(), ...afterMap.keys()]),
    ).sort();

    const changes: ParameterDiffItem[] = [];

    for (const path of allPaths) {
      const before = beforeMap.get(path) || null;
      const after = afterMap.get(path) || null;

      if (!before && after) {
        changes.push({
          path,
          before: null,
          after,
          changeType: 'added',
          changedFields: ['path'],
        });
        continue;
      }

      if (before && !after) {
        changes.push({
          path,
          before,
          after: null,
          changeType: 'removed',
          changedFields: ['path'],
        });
        continue;
      }

      if (before && after) {
        const changedFields: string[] = [];

        if (before.value !== after.value) changedFields.push('value');
        if (before.type !== after.type) changedFields.push('type');
        if (before.writable !== after.writable) changedFields.push('writable');

        if (changedFields.length > 0) {
          changes.push({
            path,
            before,
            after,
            changeType: 'changed',
            changedFields,
          });
        }
      }
    }

    return {
      baseSnapshot: {
        id: base.id,
        name: base.name,
        deviceId: base.deviceId,
        parameterCount: base.parameterCount,
        createdAt: base.createdAt,
      },
      targetSnapshot: {
        id: target.id,
        name: target.name,
        deviceId: target.deviceId,
        parameterCount: target.parameterCount,
        createdAt: target.createdAt,
      },
      summary: {
        totalChanges: changes.length,
        added: changes.filter((item) => item.changeType === 'added').length,
        removed: changes.filter((item) => item.changeType === 'removed').length,
        changed: changes.filter((item) => item.changeType === 'changed').length,
      },
      changes,
    };
  }

  async remove(id: string) {
    const snapshot = await this.get(id);

    await this.snapshotsRepository.delete(snapshot.id);

    return {
      deleted: true,
      id,
    };
  }

  private flattenParameters(
    node: any,
    currentPath: string,
    output: DeviceParameterSnapshotItem[],
  ) {
    if (!node || typeof node !== 'object') return;

    const hasValue = Object.prototype.hasOwnProperty.call(node, '_value');
    const hasWritable = Object.prototype.hasOwnProperty.call(node, '_writable');
    const hasTimestamp = Object.prototype.hasOwnProperty.call(node, '_timestamp');
    const hasType = Object.prototype.hasOwnProperty.call(node, '_type');

    if (currentPath && (hasValue || hasWritable || hasTimestamp || hasType)) {
      const rawValue = hasValue ? node._value : null;
      const value = this.stringifyValue(rawValue);

      output.push({
        path: currentPath,
        value,
        type: this.resolveType(rawValue, node._type),
        writable: Boolean(node._writable),
        timestamp: node._timestamp ? String(node._timestamp) : null,
      });
    }

    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_')) continue;

      const nextPath = currentPath ? `${currentPath}.${key}` : key;

      this.flattenParameters(value, nextPath, output);
    }
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) return '';

    if (Array.isArray(value)) {
      if (value.length === 0) return '';

      return String(value[0] ?? '');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private resolveType(value: any, explicitType?: string): string {
    if (explicitType) return String(explicitType);

    const normalizedValue = Array.isArray(value) ? value[0] : value;

    if (typeof normalizedValue === 'boolean') return 'xsd:boolean';
    if (typeof normalizedValue === 'number' && Number.isInteger(normalizedValue)) {
      return 'xsd:int';
    }
    if (typeof normalizedValue === 'number') return 'xsd:decimal';

    const stringValue = String(normalizedValue ?? '');

    if (stringValue === 'true' || stringValue === 'false') {
      return 'xsd:boolean';
    }

    if (/^-?\d+$/.test(stringValue)) {
      return 'xsd:int';
    }

    return 'xsd:string';
  }
}
