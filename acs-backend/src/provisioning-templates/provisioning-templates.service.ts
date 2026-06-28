// acs-backend/src/provisioning-templates/provisioning-templates.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { CreateProvisioningTemplateDto } from './dto/create-provisioning-template.dto';
import { UpdateProvisioningTemplateDto } from './dto/update-provisioning-template.dto';
import {
  ProvisioningTemplate,
  ProvisioningTemplateParameter,
} from './entities/provisioning-template.entity';

@Injectable()
export class ProvisioningTemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(ProvisioningTemplate)
    private readonly templatesRepository: Repository<ProvisioningTemplate>,
    private readonly devicesService: DevicesService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  async findAll(query?: {
    q?: string;
    model?: string;
    productClass?: string;
    includeInactive?: boolean;
  }): Promise<ProvisioningTemplate[]> {
    const where: any[] = [];

    const baseStatus = query?.includeInactive ? {} : { status: 'active' };

    if (query?.q?.trim()) {
      const q = `%${query.q.trim()}%`;

      where.push(
        { ...baseStatus, name: ILike(q) },
        { ...baseStatus, description: ILike(q) },
        { ...baseStatus, model: ILike(q) },
        { ...baseStatus, productClass: ILike(q) },
      );
    } else {
      where.push(baseStatus);
    }

    const templates = await this.templatesRepository.find({
      where,
      order: {
        name: 'ASC',
      },
    });

    if (!query?.model && !query?.productClass) {
      return templates;
    }

    const model = query.model?.trim().toLowerCase() || '';
    const productClass = query.productClass?.trim().toLowerCase() || '';

    return templates.filter((template) => {
      const templateModel = template.model?.toLowerCase() || '';
      const templateProductClass = template.productClass?.toLowerCase() || '';

      const generic = !templateModel && !templateProductClass;

      const modelMatches =
        Boolean(model) &&
        Boolean(templateModel) &&
        (model.includes(templateModel) || templateModel.includes(model));

      const productClassMatches =
        Boolean(productClass) &&
        Boolean(templateProductClass) &&
        (productClass.includes(templateProductClass) ||
          templateProductClass.includes(productClass));

      return generic || modelMatches || productClassMatches;
    });
  }

  async findOne(id: string): Promise<ProvisioningTemplate> {
    const template = await this.templatesRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }

    return template;
  }

  async create(
    dto: CreateProvisioningTemplateDto,
    createdByEmail?: string | null,
  ): Promise<ProvisioningTemplate> {
    const parameters = this.normalizeParameters(dto.parameters);

    const template = this.templatesRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      vendor: dto.vendor?.trim() || null,
      model: dto.model?.trim() || null,
      productClass: dto.productClass?.trim() || null,
      parameters,
      tags: this.normalizeTags(dto.tags),
      status: 'active',
      createdByEmail: createdByEmail || null,
    });

    return this.templatesRepository.save(template);
  }

  async update(
    id: string,
    dto: UpdateProvisioningTemplateDto,
  ): Promise<ProvisioningTemplate> {
    const template = await this.findOne(id);

    if (dto.name !== undefined) template.name = dto.name.trim();
    if (dto.description !== undefined) {
      template.description = dto.description?.trim() || null;
    }
    if (dto.vendor !== undefined) template.vendor = dto.vendor?.trim() || null;
    if (dto.model !== undefined) template.model = dto.model?.trim() || null;
    if (dto.productClass !== undefined) {
      template.productClass = dto.productClass?.trim() || null;
    }
    if (dto.parameters !== undefined) {
      template.parameters = this.normalizeParameters(dto.parameters);
    }
    if (dto.tags !== undefined) {
      template.tags = this.normalizeTags(dto.tags);
    }
    if (dto.status !== undefined) {
      template.status = dto.status;
    }

    return this.templatesRepository.save(template);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const template = await this.findOne(id);

    await this.templatesRepository.remove(template);

    return { deleted: true };
  }

  async applyTemplate(templateId: string, deviceId: string) {
    const template = await this.findOne(templateId);

    if (template.status !== 'active') {
      throw new BadRequestException('Este template está inativo.');
    }

    const parameterValues = this.normalizeParameters(template.parameters).map(
      (parameter) =>
        [parameter.path, parameter.value, parameter.type] as [
          string,
          any,
          string,
        ],
    );

    if (parameterValues.length === 0) {
      throw new BadRequestException('Template não possui parâmetros válidos.');
    }

    return this.devicesService.setParameterValues(deviceId, parameterValues);
  }

  private normalizeParameters(
    parameters: ProvisioningTemplateParameter[] | any[],
  ): ProvisioningTemplateParameter[] {
    if (!Array.isArray(parameters)) {
      throw new BadRequestException('parameters deve ser um array.');
    }

    const normalized = parameters
      .map((parameter) => ({
        path: String(parameter?.path || '').trim(),
        value: parameter?.value,
        type: String(parameter?.type || '').trim() || 'xsd:string',
      }))
      .filter((parameter) => parameter.path.length > 0);

    if (normalized.length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um parâmetro válido no template.',
      );
    }

    for (const parameter of normalized) {
      if (!this.isAllowedType(parameter.type)) {
        throw new BadRequestException(
          `Tipo inválido no parâmetro ${parameter.path}: ${parameter.type}`,
        );
      }

      if (this.looksSensitive(parameter.path)) {
        throw new BadRequestException(
          `Parâmetro sensível não permitido em template genérico: ${parameter.path}`,
        );
      }
    }

    return normalized;
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

  private isAllowedType(type: string): boolean {
    return [
      'xsd:string',
      'xsd:boolean',
      'xsd:unsignedInt',
      'xsd:int',
      'xsd:integer',
      'xsd:dateTime',
    ].includes(type);
  }

  private looksSensitive(path: string): boolean {
    const lower = path.toLowerCase();

    return (
      lower.includes('password') ||
      lower.includes('keypassphrase') ||
      lower.includes('presharedkey') ||
      lower.includes('radiussecret')
    );
  }

  private async seedDefaultTemplates() {
    const existingCount = await this.templatesRepository.count();

    if (existingCount > 0) return;

    const defaults: Array<Partial<ProvisioningTemplate>> = [
      {
        name: 'TP-Link EC220-G5 - TR-069 Operacional',
        description:
          'Ajusta Periodic Inform para operação ACS com atualização a cada 5 minutos.',
        vendor: 'TP-Link',
        model: 'EC220-G5',
        productClass: 'EC220-G5',
        tags: ['tplink', 'tr069', 'operacional'],
        status: 'active',
        parameters: [
          {
            path: 'Device.ManagementServer.PeriodicInformEnable',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.ManagementServer.PeriodicInformInterval',
            value: 300,
            type: 'xsd:unsignedInt',
          },
        ],
      },
      {
        name: 'TP-Link EC220-G5 - Guest Nuvyon',
        description:
          'Ativa SSID guest 2.4GHz e 5GHz com nomes padrão. Não altera senha.',
        vendor: 'TP-Link',
        model: 'EC220-G5',
        productClass: 'EC220-G5',
        tags: ['tplink', 'guest', 'wifi'],
        status: 'active',
        parameters: [
          {
            path: 'Device.WiFi.SSID.2.Enable',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.WiFi.SSID.2.SSID',
            value: 'NUVYON_WIFI',
            type: 'xsd:string',
          },
          {
            path: 'Device.WiFi.AccessPoint.2.Enable',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.WiFi.SSID.4.Enable',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.WiFi.SSID.4.SSID',
            value: 'NUVYON_WIFI_5G',
            type: 'xsd:string',
          },
          {
            path: 'Device.WiFi.AccessPoint.4.Enable',
            value: true,
            type: 'xsd:boolean',
          },
          {
            path: 'Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled',
            value: true,
            type: 'xsd:boolean',
          },
        ],
      },
    ];

    for (const item of defaults) {
      const template = this.templatesRepository.create({
        name: item.name!,
        description: item.description || null,
        vendor: item.vendor || null,
        model: item.model || null,
        productClass: item.productClass || null,
        parameters: item.parameters || [],
        tags: item.tags || [],
        status: 'active',
        createdByEmail: 'system',
      });

      await this.templatesRepository.save(template);
    }
  }
}
