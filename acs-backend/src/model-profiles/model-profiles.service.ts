import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UpsertModelProfileDto } from './dto/upsert-model-profile.dto';
import {
  ModelProfile,
  ModelProfileRootObject,
  ModelProfileStatus,
} from './entities/model-profile.entity';

@Injectable()
export class ModelProfilesService {
  constructor(
    @InjectRepository(ModelProfile)
    private readonly profilesRepository: Repository<ModelProfile>,
  ) {}

  async list(filters?: { q?: string; status?: string }) {
    const q = filters?.q?.trim();

    const where = q
      ? [
          { displayName: ILike(`%${q}%`) },
          { manufacturer: ILike(`%${q}%`) },
          { model: ILike(`%${q}%`) },
          { productClass: ILike(`%${q}%`) },
        ]
      : {};

    const profiles = await this.profilesRepository.find({
      where,
      order: {
        manufacturer: 'ASC',
        model: 'ASC',
        productClass: 'ASC',
      },
      take: 300,
    });

    return profiles.filter((profile) => {
      if (!filters?.status) return true;
      return profile.status === filters.status;
    });
  }

  async get(id: string) {
    const profile = await this.profilesRepository.findOne({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de modelo não encontrado.');
    }

    return profile;
  }

  async findByModel(input: {
    manufacturer?: string;
    model?: string;
    productClass?: string;
  }) {
    const manufacturer = this.cleanKey(input.manufacturer);
    const model = this.cleanKey(input.model);
    const productClass = this.cleanKey(input.productClass);

    return this.profilesRepository.findOne({
      where: {
        manufacturer,
        model,
        productClass,
      },
    });
  }

  async create(dto: UpsertModelProfileDto, actor?: { email: string | null }) {
    const manufacturer = this.cleanKey(dto.manufacturer);
    const model = this.cleanKey(dto.model);
    const productClass = this.cleanKey(dto.productClass);

    const existing = await this.profilesRepository.findOne({
      where: {
        manufacturer,
        model,
        productClass,
      },
    });

    if (existing) {
      return this.update(existing.id, dto, actor);
    }

    const displayName =
      this.cleanString(dto.displayName) ||
      [manufacturer, model, productClass]
        .filter((item) => item && item !== '-')
        .join(' ') ||
      'Perfil de modelo';

    const profile = this.profilesRepository.create({
      displayName,
      manufacturer,
      model,
      productClass,
      rootObject: this.resolveRootObject(dto.rootObject),
      status: this.resolveStatus(dto.status),
      parameterMap: this.cleanObject(dto.parameterMap),
      capabilities: this.cleanObject(dto.capabilities),
      recommendedTemplates: this.cleanArray(dto.recommendedTemplates),
      tags: this.cleanArray(dto.tags),
      notes: this.cleanString(dto.notes),
      createdByEmail: actor?.email || null,
      updatedByEmail: actor?.email || null,
    });

    return this.profilesRepository.save(profile);
  }

  async update(
    id: string,
    dto: UpsertModelProfileDto,
    actor?: { email: string | null },
  ) {
    const profile = await this.get(id);

    if (Object.prototype.hasOwnProperty.call(dto, 'displayName')) {
      profile.displayName = this.cleanString(dto.displayName) || profile.displayName;
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'manufacturer')) {
      profile.manufacturer = this.cleanKey(dto.manufacturer);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'model')) {
      profile.model = this.cleanKey(dto.model);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'productClass')) {
      profile.productClass = this.cleanKey(dto.productClass);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'rootObject')) {
      profile.rootObject = this.resolveRootObject(dto.rootObject);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'status')) {
      profile.status = this.resolveStatus(dto.status);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'parameterMap')) {
      profile.parameterMap = this.cleanObject(dto.parameterMap);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'capabilities')) {
      profile.capabilities = this.cleanObject(dto.capabilities);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'recommendedTemplates')) {
      profile.recommendedTemplates = this.cleanArray(dto.recommendedTemplates);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'tags')) {
      profile.tags = this.cleanArray(dto.tags);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'notes')) {
      profile.notes = this.cleanString(dto.notes);
    }

    profile.updatedByEmail = actor?.email || null;

    return this.profilesRepository.save(profile);
  }

  async remove(id: string) {
    const profile = await this.get(id);

    await this.profilesRepository.delete(profile.id);

    return {
      deleted: true,
      id,
    };
  }

  private cleanKey(value: unknown): string {
    const normalized = String(value || '').trim();

    return normalized || '-';
  }

  private cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    const normalized = String(value).trim();

    return normalized || null;
  }

  private cleanArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 50),
      ),
    );
  }

  private cleanObject(value: unknown): Record<string, any> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    return value as Record<string, any>;
  }

  private resolveRootObject(value: unknown): ModelProfileRootObject {
    const allowed: ModelProfileRootObject[] = [
      'Device',
      'InternetGatewayDevice',
      'mixed',
      'unknown',
    ];

    const normalized = String(value || 'unknown') as ModelProfileRootObject;

    return allowed.includes(normalized) ? normalized : 'unknown';
  }

  private resolveStatus(value: unknown): ModelProfileStatus {
    const allowed: ModelProfileStatus[] = ['active', 'draft', 'deprecated'];

    const normalized = String(value || 'active') as ModelProfileStatus;

    return allowed.includes(normalized) ? normalized : 'active';
  }
}
