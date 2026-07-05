import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { UpsertModelProfileDto } from './dto/upsert-model-profile.dto';
import {
  ModelProfile,
  ModelProfileRootObject,
  ModelProfileStatus,
} from './entities/model-profile.entity';

interface FlatParameter {
  path: string;
  value: string;
  type: string;
  writable: boolean;
}

@Injectable()
export class ModelProfilesService {
  constructor(
    @InjectRepository(ModelProfile)
    private readonly profilesRepository: Repository<ModelProfile>,
    private readonly devicesService: DevicesService,
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

  async suggestFromDevice(deviceId: string) {
    const rawDevice = await this.devicesService.findRawDeviceById(deviceId);

    const parameters: FlatParameter[] = [];
    this.flattenParameters(rawDevice, '', parameters);

    const manufacturer = this.cleanKey(
      this.pickString(rawDevice, [
        'Device.DeviceInfo.Manufacturer',
        'InternetGatewayDevice.DeviceInfo.Manufacturer',
        '_deviceId._Manufacturer',
      ]),
    );

    const productClass = this.cleanKey(
      this.pickString(rawDevice, [
        'Device.DeviceInfo.ProductClass',
        'InternetGatewayDevice.DeviceInfo.ProductClass',
        '_deviceId._ProductClass',
      ]),
    );

    const model = this.cleanKey(
      this.pickString(rawDevice, [
        'Device.DeviceInfo.ModelName',
        'InternetGatewayDevice.DeviceInfo.ModelName',
        'Device.DeviceInfo.Model',
        'InternetGatewayDevice.DeviceInfo.Model',
      ]) || productClass,
    );

    const hasDeviceRoot = parameters.some((item) => item.path.startsWith('Device.'));
    const hasIgdRoot = parameters.some((item) =>
      item.path.startsWith('InternetGatewayDevice.'),
    );

    const rootObject: ModelProfileRootObject =
      hasDeviceRoot && hasIgdRoot
        ? 'mixed'
        : hasDeviceRoot
          ? 'Device'
          : hasIgdRoot
            ? 'InternetGatewayDevice'
            : 'unknown';

    const parameterMap = {
      wifi2gSsid: this.findPath(parameters, [
        'Device.WiFi.SSID.1.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      ]),
      wifi2gPassword: this.findPath(parameters, [
        'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
        'Device.WiFi.AccessPoint.1.Security.PreSharedKey.1.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      ]),
      wifi5gSsid: this.findPath(parameters, [
        'Device.WiFi.SSID.3.SSID',
        'Device.WiFi.SSID.2.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      ]),
      wifi5gPassword: this.findPath(parameters, [
        'Device.WiFi.AccessPoint.3.Security.KeyPassphrase',
        'Device.WiFi.AccessPoint.3.Security.PreSharedKey.1.KeyPassphrase',
        'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
      ]),
      guest2gEnable: this.findPath(parameters, [
        'Device.WiFi.SSID.2.Enable',
        'Device.WiFi.AccessPoint.2.Enable',
      ]),
      guest2gSsid: this.findPath(parameters, [
        'Device.WiFi.SSID.2.SSID',
      ]),
      guest2gPassword: this.findPath(parameters, [
        'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
        'Device.WiFi.AccessPoint.2.Security.PreSharedKey.1.KeyPassphrase',
      ]),
      guest5gEnable: this.findPath(parameters, [
        'Device.WiFi.SSID.4.Enable',
        'Device.WiFi.AccessPoint.4.Enable',
      ]),
      guest5gSsid: this.findPath(parameters, [
        'Device.WiFi.SSID.4.SSID',
      ]),
      guest5gPassword: this.findPath(parameters, [
        'Device.WiFi.AccessPoint.4.Security.KeyPassphrase',
        'Device.WiFi.AccessPoint.4.Security.PreSharedKey.1.KeyPassphrase',
      ]),
      periodicInformEnable: this.findPath(parameters, [
        'Device.ManagementServer.PeriodicInformEnable',
        'InternetGatewayDevice.ManagementServer.PeriodicInformEnable',
      ]),
      periodicInformInterval: this.findPath(parameters, [
        'Device.ManagementServer.PeriodicInformInterval',
        'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
      ]),
      connectionRequestUrl: this.findPath(parameters, [
        'Device.ManagementServer.ConnectionRequestURL',
        'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      ]),
      wanIp: this.findPath(parameters, [
        'Device.PPP.Interface.1.IPCP.LocalIPAddress',
        'Device.IP.Interface.2.IPv4Address.1.IPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
      ]),
      pppUsername: this.findPath(parameters, [
        'Device.PPP.Interface.1.Username',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      ]),
      vlanWan: this.findPathByIncludes(parameters, [
        ['Ethernet', 'VLAN'],
        ['VLANTermination'],
        ['WAN', 'VLAN'],
      ]),
      firmwareVersion: this.findPath(parameters, [
        'Device.DeviceInfo.SoftwareVersion',
        'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      ]),
    };

    const hasPath = (...terms: string[]) =>
      parameters.some((parameter) => {
        const normalized = parameter.path.toLowerCase();
        return terms.every((term) => normalized.includes(term.toLowerCase()));
      });

    const hasWritablePath = (...terms: string[]) =>
      parameters.some((parameter) => {
        const normalized = parameter.path.toLowerCase();
        return (
          parameter.writable &&
          terms.every((term) => normalized.includes(term.toLowerCase()))
        );
      });

    const capabilities = {
      connectionRequest: Boolean(parameterMap.connectionRequestUrl),
      reboot: hasDeviceRoot || hasIgdRoot,
      wifiRead: hasPath('WiFi', 'SSID') || hasPath('WLANConfiguration', 'SSID'),
      wifiWrite:
        hasWritablePath('WiFi', 'SSID') ||
        hasWritablePath('WLANConfiguration', 'SSID'),
      wifiPasswordRead: parameters.some((parameter) => {
        const path = parameter.path.toLowerCase();
        return (
          (path.includes('keypassphrase') || path.includes('presharedkey')) &&
          Boolean(parameter.value)
        );
      }),
      wifiPasswordWrite: parameters.some((parameter) => {
        const path = parameter.path.toLowerCase();
        return (
          parameter.writable &&
          (path.includes('keypassphrase') || path.includes('presharedkey'))
        );
      }),
      guestWifi: Boolean(
        parameterMap.guest2gSsid ||
          parameterMap.guest5gSsid ||
          parameterMap.guest2gEnable ||
          parameterMap.guest5gEnable,
      ),
      vlanBySsid: hasPath('WiFi', 'VLAN') || hasPath('SSID', 'VLAN'),
      wanVlan: Boolean(parameterMap.vlanWan),
      firmwareUpgrade: hasPath('DeviceInfo', 'Firmware') || hasPath('Download'),
      hostsRead: hasPath('Hosts', 'Host') || hasPath('LAN', 'Hosts'),
    };

    const tags = Array.from(
      new Set(
        [manufacturer, model, productClass, rootObject.toLowerCase()]
          .filter((item) => item && item !== '-')
          .map((item) => String(item).toLowerCase().replace(/\s+/g, '-')),
      ),
    );

    const foundPaths = Object.entries(parameterMap)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`);

    return {
      profile: {
        displayName: [manufacturer, model]
          .filter((item) => item && item !== '-')
          .join(' ') || 'Perfil de modelo sugerido',
        manufacturer,
        model,
        productClass,
        rootObject,
        status: 'draft',
        parameterMap,
        capabilities,
        recommendedTemplates: [],
        tags,
        notes:
          `Perfil sugerido automaticamente pelo ACS a partir do CPE ${deviceId}.\n\n` +
          `Total de parâmetros analisados: ${parameters.length}.\n` +
          `Paths reconhecidos: ${foundPaths.length}.\n\n` +
          `Revise antes de marcar como ativo.\n\n` +
          foundPaths.join('\n'),
      },
      evidence: {
        parameterCount: parameters.length,
        rootObject,
        foundPaths,
        writableKnownPaths: parameters
          .filter((item) => item.writable)
          .map((item) => item.path)
          .filter((path) =>
            [
              'WiFi',
              'SSID',
              'ManagementServer',
              'PPP',
              'VLAN',
              'DeviceInfo',
            ].some((term) => path.includes(term)),
          )
          .slice(0, 80),
      },
    };
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

  private flattenParameters(node: any, currentPath: string, output: FlatParameter[]) {
    if (!node || typeof node !== 'object') return;

    const hasValue = Object.prototype.hasOwnProperty.call(node, '_value');
    const hasWritable = Object.prototype.hasOwnProperty.call(node, '_writable');
    const hasType = Object.prototype.hasOwnProperty.call(node, '_type');

    if (currentPath && (hasValue || hasWritable || hasType)) {
      output.push({
        path: currentPath,
        value: this.stringifyValue(hasValue ? node._value : null),
        type: node._type ? String(node._type) : 'xsd:string',
        writable: Boolean(node._writable),
      });
    }

    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_')) continue;
      this.flattenParameters(value, currentPath ? `${currentPath}.${key}` : key, output);
    }
  }

  private getNode(device: any, path: string) {
    return path.split('.').reduce((current, part) => {
      if (!current || typeof current !== 'object') return null;
      return current[part];
    }, device);
  }

  private pickString(device: any, paths: string[]): string {
    for (const path of paths) {
      const node = this.getNode(device, path);
      const value = node?._value !== undefined ? node._value : node;

      const normalized = this.stringifyValue(value).trim();

      if (normalized) return normalized;
    }

    return '';
  }

  private findPath(parameters: FlatParameter[], candidates: string[]) {
    const lowerMap = new Map(
      parameters.map((parameter) => [parameter.path.toLowerCase(), parameter.path]),
    );

    for (const candidate of candidates) {
      const found = lowerMap.get(candidate.toLowerCase());
      if (found) return found;
    }

    return '';
  }

  private findPathByIncludes(parameters: FlatParameter[], groups: string[][]) {
    for (const terms of groups) {
      const found = parameters.find((parameter) => {
        const path = parameter.path.toLowerCase();
        return terms.every((term) => path.includes(term.toLowerCase()));
      });

      if (found) return found.path;
    }

    return '';
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
