import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateDeviceMetadataDto } from './dto/update-device-metadata.dto';
import {
  DeviceMetadata,
  DeviceOperationalMode,
} from './entities/device-metadata.entity';

@Injectable()
export class DeviceMetadataService {
  constructor(
    @InjectRepository(DeviceMetadata)
    private readonly metadataRepository: Repository<DeviceMetadata>,
  ) {}

  async getByDeviceId(deviceId: string) {
    const existing = await this.metadataRepository.findOne({
      where: { deviceId },
    });

    if (existing) return existing;

    return {
      id: null,
      deviceId,
      label: null,
      customerName: null,
      customerCode: null,
      city: null,
      address: null,
      operationalMode: 'unknown',
      tags: [],
      notes: null,
      updatedByEmail: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  async findExistingByDeviceId(deviceId: string) {
    return this.metadataRepository.findOne({
      where: { deviceId },
    });
  }

  async updateByDeviceId(
    deviceId: string,
    dto: UpdateDeviceMetadataDto,
    actor?: { email: string | null },
  ) {
    let metadata = await this.metadataRepository.findOne({
      where: { deviceId },
    });

    if (!metadata) {
      metadata = this.metadataRepository.create({
        deviceId,
        label: null,
        customerName: null,
        customerCode: null,
        city: null,
        address: null,
        operationalMode: 'unknown',
        tags: [],
        notes: null,
        updatedByEmail: null,
      });
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'label')) {
      metadata.label = this.cleanString(dto.label);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'customerName')) {
      metadata.customerName = this.cleanString(dto.customerName);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'customerCode')) {
      metadata.customerCode = this.cleanString(dto.customerCode);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'city')) {
      metadata.city = this.cleanString(dto.city);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'address')) {
      metadata.address = this.cleanString(dto.address);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'operationalMode')) {
      metadata.operationalMode = this.resolveOperationalMode(
        dto.operationalMode,
      );
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'tags')) {
      metadata.tags = this.cleanTags(dto.tags);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'notes')) {
      metadata.notes = this.cleanString(dto.notes);
    }

    metadata.updatedByEmail = actor?.email || null;

    return this.metadataRepository.save(metadata);
  }

  private cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    const normalized = String(value).trim();

    return normalized || null;
  }

  private cleanTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];

    return Array.from(
      new Set(
        tags
          .map((tag) => String(tag || '').trim())
          .filter((tag) => Boolean(tag))
          .slice(0, 20),
      ),
    );
  }

  private resolveOperationalMode(value: unknown): DeviceOperationalMode {
    const allowed: DeviceOperationalMode[] = [
      'unknown',
      'production',
      'lab',
      'ap',
      'bridge',
      'maintenance',
    ];

    const normalized = String(value || 'unknown') as DeviceOperationalMode;

    return allowed.includes(normalized) ? normalized : 'unknown';
  }
}
