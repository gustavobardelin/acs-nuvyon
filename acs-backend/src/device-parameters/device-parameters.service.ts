import { Injectable } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';

export interface DeviceParameterExplorerItem {
  path: string;
  value: string;
  rawValue: any;
  type: string;
  writable: boolean;
  timestamp: string | null;
  hasValue: boolean;
  isObject: boolean;
}

@Injectable()
export class DeviceParametersService {
  constructor(private readonly devicesService: DevicesService) {}

  async findParameters(
    deviceId: string,
    filters?: {
      q?: string;
      writable?: string;
      limit?: string;
    },
  ) {
    const rawDevice = await this.devicesService.findRawDeviceById(deviceId);

    const allParameters: DeviceParameterExplorerItem[] = [];

    this.flattenParameters(rawDevice, '', allParameters);

    const q = String(filters?.q || '').trim().toLowerCase();
    const writableFilter = String(filters?.writable || '').trim();
    const limit = Math.min(
      Math.max(Number(filters?.limit || 500), 1),
      5000,
    );

    const filtered = allParameters
      .filter((parameter) => {
        if (!parameter.path) return false;

        if (q) {
          const haystack = [
            parameter.path,
            parameter.value,
            parameter.type,
            parameter.writable ? 'writable' : 'readonly',
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(q)) return false;
        }

        if (writableFilter === 'true' && !parameter.writable) return false;
        if (writableFilter === 'false' && parameter.writable) return false;

        return true;
      })
      .sort((a, b) => {
        if (q) {
          const aExact = a.path.toLowerCase() === q ? 0 : 1;
          const bExact = b.path.toLowerCase() === q ? 0 : 1;

          if (aExact !== bExact) return aExact - bExact;

          const aStarts = a.path.toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = b.path.toLowerCase().startsWith(q) ? 0 : 1;

          if (aStarts !== bStarts) return aStarts - bStarts;
        }

        if (a.hasValue !== b.hasValue) return a.hasValue ? -1 : 1;

        return a.path.localeCompare(b.path);
      })
      .slice(0, limit);

    return {
      deviceId,
      total: allParameters.length,
      filtered: filtered.length,
      limit,
      parameters: filtered,
    };
  }

  async refreshObject(deviceId: string, objectName = 'Device') {
    return this.devicesService.refresh(deviceId, objectName || 'Device');
  }

  async setParameter(
    deviceId: string,
    input: {
      path: string;
      value: string | number | boolean;
      type?: string;
    },
  ) {
    const type = input.type || this.inferXsdType(input.value);
    const value = this.normalizeValueByType(input.value, type);

    return this.devicesService.setParameterValues(deviceId, [
      [input.path, value, type],
    ]);
  }

  private flattenParameters(
    node: any,
    currentPath: string,
    output: DeviceParameterExplorerItem[],
  ) {
    if (!node || typeof node !== 'object') return;

    const hasValue = Object.prototype.hasOwnProperty.call(node, '_value');
    const hasWritable = Object.prototype.hasOwnProperty.call(node, '_writable');
    const hasTimestamp = Object.prototype.hasOwnProperty.call(node, '_timestamp');
    const hasType = Object.prototype.hasOwnProperty.call(node, '_type');

    if (currentPath && (hasValue || hasWritable || hasTimestamp || hasType)) {
      const rawValue = hasValue ? node._value : null;
      const type = this.resolveType(rawValue, node._type);

      output.push({
        path: currentPath,
        value: this.stringifyValue(rawValue),
        rawValue,
        type,
        writable: Boolean(node._writable),
        timestamp: node._timestamp ? String(node._timestamp) : null,
        hasValue,
        isObject: !hasValue,
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

    return this.inferXsdType(normalizedValue);
  }

  private inferXsdType(value: any): string {
    if (typeof value === 'boolean') return 'xsd:boolean';
    if (typeof value === 'number' && Number.isInteger(value)) return 'xsd:int';
    if (typeof value === 'number') return 'xsd:decimal';

    const stringValue = String(value ?? '');

    if (stringValue === 'true' || stringValue === 'false') {
      return 'xsd:boolean';
    }

    if (/^-?\d+$/.test(stringValue)) {
      return 'xsd:int';
    }

    return 'xsd:string';
  }

  private normalizeValueByType(value: string | number | boolean, type: string) {
    const normalizedType = String(type || '').toLowerCase();

    if (normalizedType.includes('boolean')) {
      if (value === true || value === 'true' || value === '1') return true;
      if (value === false || value === 'false' || value === '0') return false;

      return Boolean(value);
    }

    if (
      normalizedType.includes('int') ||
      normalizedType.includes('unsigned') ||
      normalizedType.includes('long')
    ) {
      return Number.parseInt(String(value), 10);
    }

    if (
      normalizedType.includes('decimal') ||
      normalizedType.includes('float') ||
      normalizedType.includes('double')
    ) {
      return Number.parseFloat(String(value));
    }

    return String(value);
  }
}
