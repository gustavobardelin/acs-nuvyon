// acs-backend/src/devices/devices.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { GenieACSService } from '../genieacs/genieacs.service';
import {
  DeviceConnectionRequestInfo,
  DeviceConnectionRequestSource,
  DeviceCapability,
  DeviceConnectionRequestTestResult,
  DeviceDetails,
  DeviceHost,
  DeviceParameterInfo,
  DeviceStatus,
  DeviceSummary,
  DeviceWifiNetwork,
  TrStandard,
} from './interfaces/device-normalized.interface';

type RawGenieACSDevice = Record<string, any>;
type WifiWriteStandard = 'TR-098' | 'TR-181';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly genieacsService: GenieACSService) {}

  async findAll(query?: string): Promise<DeviceSummary[]> {
    const devices = await this.genieacsService.getDevices();

    const normalized = devices.map((device: RawGenieACSDevice) =>
      this.normalizeSummary(device),
    );

    if (!query?.trim()) {
      return normalized;
    }

    const search = query.trim().toLowerCase();

    return normalized.filter((device) => {
      return [
        device.id,
        device.mac,
        device.serialNumber,
        device.oui,
        device.manufacturer,
        device.model,
        device.productClass,
        device.hardwareVersion,
        device.softwareVersion,
        device.ip,
        device.lanIp,
        device.pppoe,
        ...device.wifi.map((wifi) => wifi.ssid),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }

  async findOne(deviceId: string): Promise<DeviceDetails> {
    const rawDevice = await this.findRawDeviceById(deviceId);

    return this.normalizeDetails(rawDevice);
  }

  async getConnectionRequest(
    deviceId: string,
  ): Promise<DeviceConnectionRequestInfo> {
    const rawDevice = await this.findRawDeviceById(deviceId);

    return this.getConnectionRequestInfo(rawDevice);
  }

  async testConnectionRequest(
    deviceId: string,
  ): Promise<DeviceConnectionRequestTestResult> {
    const rawDevice = await this.findRawDeviceById(deviceId);
    const connectionRequest = this.getConnectionRequestInfo(rawDevice);

    if (!connectionRequest.url) {
      throw new BadRequestException(
        'Este dispositivo não possui ConnectionRequestURL sincronizada.',
      );
    }

    const startedAt = Date.now();

    try {
      const response = await axios.get(connectionRequest.url, {
        timeout: 5000,
        validateStatus: () => true,
      });

      const latencyMs = Date.now() - startedAt;
      const authHeader = this.getHeader(response.headers, 'www-authenticate');
      const server = this.getHeader(response.headers, 'server');
      const authType = this.resolveAuthType(authHeader);

      return {
        url: connectionRequest.url,
        reachable: true,
        statusCode: response.status,
        latencyMs,
        authType,
        authHeader,
        server,
        testedAt: new Date().toISOString(),
        message:
          response.status === 401
            ? 'Alcançável. O CPE respondeu e solicitou autenticação.'
            : `Alcançável. O CPE respondeu HTTP ${response.status}.`,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startedAt;

      return {
        url: connectionRequest.url,
        reachable: false,
        statusCode: null,
        latencyMs,
        authType: 'Unknown',
        authHeader: null,
        server: null,
        testedAt: new Date().toISOString(),
        message:
          error?.code === 'ECONNABORTED'
            ? 'Timeout ao tentar acessar o Connection Request.'
            : error?.message || 'Falha ao acessar o Connection Request.',
      };
    }
  }

  async reboot(deviceId: string) {
    const rawDevice = await this.findRawDeviceById(deviceId);

    return this.genieacsService.rebootDevice(rawDevice._id);
  }

  async refresh(deviceId: string, objectName = '') {
    const rawDevice = await this.findRawDeviceById(deviceId);

    return this.genieacsService.refreshObject(rawDevice._id, objectName);
  }

  async updateWifi(payload: {
    deviceId: string;
    instance: string;
    ssid?: string;
    password?: string;
    enabled?: boolean;
    standard?: TrStandard;
  }) {
    const rawDevice = await this.findRawDeviceById(payload.deviceId);

    const writeStandard = this.resolveWifiWriteStandard(
      rawDevice,
      payload.instance,
      payload.standard,
    );

    const parameterValues = this.buildWifiParameters({
      standard: writeStandard,
      instance: payload.instance,
      ssid: payload.ssid,
      password: payload.password,
      enabled: payload.enabled,
    });

    if (parameterValues.length === 0) {
      throw new BadRequestException(
        'Nenhum parâmetro Wi-Fi válido foi informado para alteração.',
      );
    }

    return this.genieacsService.setParameterValues(
      rawDevice._id,
      parameterValues,
    );
  }

  async updateGuestWifi(payload: {
    deviceId: string;
    ssid2g?: string;
    ssid5g?: string;
    password?: string;
    enabled?: boolean;
    hideSsid?: boolean;
    isolation?: boolean;
  }) {
    const rawDevice = await this.findRawDeviceById(payload.deviceId);

    const hasGuest2g = Boolean(
      this.getByPath(rawDevice, 'Device.WiFi.SSID.2'),
    );

    const hasGuest5g = Boolean(
      this.getByPath(rawDevice, 'Device.WiFi.SSID.4'),
    );

    if (!hasGuest2g && !hasGuest5g) {
      throw new BadRequestException(
        'Este CPE não possui SSID guest/secundário TR-181 detectado.',
      );
    }

    const parameterValues: [string, any, string][] = [];

    const addIfWritable = (path: string, value: any, type: string) => {
      if (this.isParameterWritable(rawDevice, path)) {
        parameterValues.push([path, value, type]);
      }
    };

    const addIfExists = (path: string, value: any, type: string) => {
      if (this.getByPath(rawDevice, path)) {
        parameterValues.push([path, value, type]);
      }
    };

    if (payload.ssid2g !== undefined && payload.ssid2g.trim()) {
      addIfWritable(
        'Device.WiFi.SSID.2.SSID',
        payload.ssid2g.trim(),
        'xsd:string',
      );
    }

    if (payload.ssid5g !== undefined && payload.ssid5g.trim()) {
      addIfWritable(
        'Device.WiFi.SSID.4.SSID',
        payload.ssid5g.trim(),
        'xsd:string',
      );
    }

    if (payload.enabled !== undefined) {
      addIfWritable('Device.WiFi.SSID.2.Enable', payload.enabled, 'xsd:boolean');
      addIfWritable('Device.WiFi.SSID.4.Enable', payload.enabled, 'xsd:boolean');

      addIfWritable(
        'Device.WiFi.AccessPoint.2.Enable',
        payload.enabled,
        'xsd:boolean',
      );
      addIfWritable(
        'Device.WiFi.AccessPoint.4.Enable',
        payload.enabled,
        'xsd:boolean',
      );
    }

    if (payload.hideSsid !== undefined) {
      const advertisementEnabled = !payload.hideSsid;

      addIfWritable(
        'Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled',
        advertisementEnabled,
        'xsd:boolean',
      );
      addIfWritable(
        'Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled',
        advertisementEnabled,
        'xsd:boolean',
      );
    }

    if (payload.password !== undefined && payload.password.trim()) {
      const password = payload.password.trim();

      addIfWritable(
        'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
        password,
        'xsd:string',
      );
      addIfWritable(
        'Device.WiFi.AccessPoint.4.Security.KeyPassphrase',
        password,
        'xsd:string',
      );

      addIfWritable(
        'Device.WiFi.AccessPoint.2.Security.PreSharedKey',
        password,
        'xsd:string',
      );
      addIfWritable(
        'Device.WiFi.AccessPoint.4.Security.PreSharedKey',
        password,
        'xsd:string',
      );

      addIfExists(
        'Device.WiFi.AccessPoint.2.Security.ModeEnabled',
        'WPA2-Personal',
        'xsd:string',
      );
      addIfExists(
        'Device.WiFi.AccessPoint.4.Security.ModeEnabled',
        'WPA2-Personal',
        'xsd:string',
      );

      addIfExists(
        'Device.WiFi.AccessPoint.2.Security.EncryptionMode',
        'AES',
        'xsd:string',
      );
      addIfExists(
        'Device.WiFi.AccessPoint.4.Security.EncryptionMode',
        'AES',
        'xsd:string',
      );

      addIfExists(
        'Device.WiFi.AccessPoint.2.Security.X_TP_PSKType',
        'KeyPassphrase',
        'xsd:string',
      );
      addIfExists(
        'Device.WiFi.AccessPoint.4.Security.X_TP_PSKType',
        'KeyPassphrase',
        'xsd:string',
      );
    }

    if (payload.isolation !== undefined) {
      addIfWritable(
        'Device.WiFi.Radio.1.IsolationEnable',
        payload.isolation,
        'xsd:boolean',
      );
      addIfWritable(
        'Device.WiFi.Radio.2.IsolationEnable',
        payload.isolation,
        'xsd:boolean',
      );
    }

    if (parameterValues.length === 0) {
      throw new BadRequestException(
        'Nenhum parâmetro Guest Wi-Fi válido/gravável foi encontrado para alteração.',
      );
    }

    return this.genieacsService.setParameterValues(
      rawDevice._id,
      parameterValues,
    );
  }

  async setParameterValues(
    deviceId: string,
    parameterValues: [string, any, string][],
  ) {
    const rawDevice = await this.findRawDeviceById(deviceId);

    if (!parameterValues.length) {
      throw new BadRequestException(
        'Nenhum parâmetro válido informado para alteração.',
      );
    }

    return this.genieacsService.setParameterValues(
      rawDevice._id,
      parameterValues,
    );
  }

  async findRawDeviceById(
    deviceId: string,
  ): Promise<RawGenieACSDevice> {
    const possibleIds = this.buildPossibleDeviceIds(deviceId);

    for (const id of possibleIds) {
      try {
        const result = await this.genieacsService.getDevices(
          JSON.stringify({ _id: id }),
        );

        if (Array.isArray(result) && result.length > 0) {
          return result[0];
        }
      } catch (error: any) {
        this.logger.warn(
          `Falha ao buscar device ${id}: ${error?.message || error}`,
        );
      }
    }

    const devices = await this.genieacsService.getDevices();

    const found = devices.find((device: RawGenieACSDevice) =>
      possibleIds.includes(device._id),
    );

    if (found) return found;

    throw new NotFoundException(`Dispositivo não encontrado: ${deviceId}`);
  }

  private buildPossibleDeviceIds(deviceId: string): string[] {
    const ids = new Set<string>();

    const onceDecoded = decodeURIComponentSafe(deviceId);
    const twiceDecoded = decodeURIComponentSafe(onceDecoded);

    ids.add(deviceId);
    ids.add(onceDecoded);
    ids.add(twiceDecoded);
    ids.add(encodeURIComponent(deviceId));
    ids.add(encodeURIComponent(onceDecoded));
    ids.add(encodeURIComponent(twiceDecoded));

    return Array.from(ids).filter(Boolean);
  }

  private resolveWifiWriteStandard(
    device: RawGenieACSDevice,
    instance: string,
    requestedStandard?: TrStandard,
  ): WifiWriteStandard {
    if (requestedStandard === 'TR-098') return 'TR-098';
    if (requestedStandard === 'TR-181') return 'TR-181';

    const hasTr181AccessPoint = Boolean(
      this.getByPath(device, `Device.WiFi.AccessPoint.${instance}`),
    );

    const hasTr181Ssid = Boolean(
      this.getByPath(device, `Device.WiFi.SSID.${instance}`),
    );

    const hasTr098Wlan = Boolean(
      this.getByPath(
        device,
        `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instance}`,
      ),
    );

    if (hasTr181AccessPoint || hasTr181Ssid) return 'TR-181';
    if (hasTr098Wlan) return 'TR-098';

    const standard = this.detectStandard(device);

    if (standard === 'TR-098') return 'TR-098';

    return 'TR-181';
  }

  private buildWifiParameters(input: {
    standard: WifiWriteStandard;
    instance: string;
    ssid?: string;
    password?: string;
    enabled?: boolean;
  }): [string, any, string][] {
    if (input.standard === 'TR-098') {
      return this.buildTr098WifiParameters(input);
    }

    return this.buildTr181WifiParameters(input);
  }

  private buildTr181WifiParameters(input: {
    instance: string;
    ssid?: string;
    password?: string;
    enabled?: boolean;
  }): [string, any, string][] {
    const params: [string, any, string][] = [];

    if (input.ssid !== undefined) {
      params.push([
        `Device.WiFi.SSID.${input.instance}.SSID`,
        input.ssid,
        'xsd:string',
      ]);
    }

    if (input.password !== undefined && input.password.trim()) {
      params.push([
        `Device.WiFi.AccessPoint.${input.instance}.Security.KeyPassphrase`,
        input.password,
        'xsd:string',
      ]);
    }

    if (input.enabled !== undefined) {
      params.push([
        `Device.WiFi.AccessPoint.${input.instance}.Enable`,
        input.enabled,
        'xsd:boolean',
      ]);
      params.push([
        `Device.WiFi.SSID.${input.instance}.Enable`,
        input.enabled,
        'xsd:boolean',
      ]);
    }

    return params;
  }

  private buildTr098WifiParameters(input: {
    instance: string;
    ssid?: string;
    password?: string;
    enabled?: boolean;
  }): [string, any, string][] {
    const base = `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${input.instance}`;
    const params: [string, any, string][] = [];

    if (input.ssid !== undefined) {
      params.push([`${base}.SSID`, input.ssid, 'xsd:string']);
    }

    if (input.password !== undefined && input.password.trim()) {
      params.push([`${base}.KeyPassphrase`, input.password, 'xsd:string']);
    }

    if (input.enabled !== undefined) {
      params.push([`${base}.Enable`, input.enabled, 'xsd:boolean']);
    }

    return params;
  }

  private normalizeSummary(device: RawGenieACSDevice): DeviceSummary {
    const lastContact = this.resolveLastContact(device);

    return {
      id: device._id,
      mac: this.resolveMac(device),
      serialNumber: this.resolveSerialNumber(device),
      oui: this.resolveOui(device),
      manufacturer: this.resolveManufacturer(device),
      model: this.resolveModel(device),
      productClass: this.resolveProductClass(device),
      hardwareVersion: this.resolveHardwareVersion(device),
      softwareVersion: this.resolveSoftwareVersion(device),
      ip: this.getWanIp(device),
      lanIp: this.getLanIp(device),
      pppoe: this.getPppoeUser(device),
      wifi: this.getWifiInfo(device),
      lastContact,
      status: this.resolveStatus(lastContact),
      standard: this.detectStandard(device),
      tags: [],
    };
  }

  private normalizeDetails(device: RawGenieACSDevice): DeviceDetails {
    const summary = this.normalizeSummary(device);
    const hosts = this.getHosts(device);
    const uptimeSeconds = this.resolveUptime(device);

    return {
      ...summary,
      uptimeSeconds,
      uptimeFormatted: this.formatUptime(uptimeSeconds),
      hostCount: hosts.length,
      activeHostCount: hosts.filter((host) => host.active).length,
      hosts,
      importantParameters: this.getImportantParameters(device),
      connectionRequest: this.getConnectionRequestInfo(device),
      capabilities: this.getDeviceCapabilities(device),
    };
  }

  private detectStandard(device: RawGenieACSDevice): TrStandard {
    const hasTr181 = Boolean(device?.Device);
    const hasTr098 = Boolean(device?.InternetGatewayDevice);

    if (hasTr181 && hasTr098) return 'TR-098/TR-181';
    if (hasTr181) return 'TR-181';
    if (hasTr098) return 'TR-098';

    return 'DESCONHECIDO';
  }

  private getByPath(source: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;

      return current[key];
    }, source);
  }

  private resolveValue(parameter: any): any {
    if (parameter === null || parameter === undefined) return null;

    if (
      typeof parameter === 'object' &&
      Object.prototype.hasOwnProperty.call(parameter, '_value')
    ) {
      return parameter._value;
    }

    return parameter;
  }

  private pickString(device: RawGenieACSDevice, paths: string[]): string {
    for (const path of paths) {
      const value = this.resolveValue(this.getByPath(device, path));

      if (value === null || value === undefined) continue;

      const normalized = String(value).trim();

      if (normalized.length > 0) {
        return normalized;
      }
    }

    return '';
  }

  private getInstanceKeys(device: RawGenieACSDevice, path: string): string[] {
    const object = this.getByPath(device, path);

    if (!object || typeof object !== 'object') return [];

    return Object.keys(object)
      .filter((key) => !key.startsWith('_'))
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));
  }

  private resolveManufacturer(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.Manufacturer',
        'InternetGatewayDevice.DeviceInfo.Manufacturer',
      ]) || '-'
    );
  }

  private resolveModel(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.ModelName',
        'Device.DeviceInfo.ProductClass',
        'InternetGatewayDevice.DeviceInfo.ModelName',
        'InternetGatewayDevice.DeviceInfo.ProductClass',
      ]) || '-'
    );
  }

  private resolveProductClass(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.ProductClass',
        'InternetGatewayDevice.DeviceInfo.ProductClass',
      ]) || '-'
    );
  }

  private resolveSerialNumber(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.SerialNumber',
        'InternetGatewayDevice.DeviceInfo.SerialNumber',
      ]) || '-'
    );
  }

  private resolveOui(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.ManufacturerOUI',
        'InternetGatewayDevice.DeviceInfo.ManufacturerOUI',
      ]) || '-'
    );
  }

  private resolveHardwareVersion(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.HardwareVersion',
        'InternetGatewayDevice.DeviceInfo.HardwareVersion',
      ]) || '-'
    );
  }

  private resolveSoftwareVersion(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.DeviceInfo.SoftwareVersion',
        'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      ]) || '-'
    );
  }

  private resolveMac(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.Ethernet.Interface.1.MACAddress',
        'Device.WiFi.SSID.1.MACAddress',
        'Device.IP.Interface.1.MACAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.MACAddress',
        'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress',
      ]) || '-'
    );
  }

  private resolveLastContact(device: RawGenieACSDevice): string | null {
    const lastContact =
      device?._lastInform ||
      device?._lastContact ||
      device?._lastBoot ||
      device?._lastBootstrap ||
      null;

    if (!lastContact) return null;

    return String(lastContact);
  }

  private resolveStatus(lastContact: string | null): DeviceStatus {
    if (!lastContact) return 'offline';

    const parsed = new Date(lastContact).getTime();

    if (Number.isNaN(parsed)) return 'offline';

    const diffMinutes = (Date.now() - parsed) / 1000 / 60;

    if (diffMinutes <= 15) return 'online';
    if (diffMinutes <= 120) return 'warning';

    return 'offline';
  }

  private getWanIp(device: RawGenieACSDevice): string {
    const preferredWanIp =
      this.pickString(device, [
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANIPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1.ExternalIPAddress',
        'Device.PPP.Interface.1.IPCP.LocalIPAddress',
        'Device.PPP.Interface.2.IPCP.LocalIPAddress',
        'Device.PPP.Interface.3.IPCP.LocalIPAddress',
      ]) || '';

    if (this.isValidIp(preferredWanIp)) {
      return preferredWanIp;
    }

    const lanIp = this.getLanIp(device);

    const fallbackCandidates = [
      'Device.IP.Interface.2.IPv4Address.1.IPAddress',
      'Device.IP.Interface.3.IPv4Address.1.IPAddress',
      'Device.IP.Interface.4.IPv4Address.1.IPAddress',
      'Device.IP.Interface.5.IPv4Address.1.IPAddress',
      'Device.IP.Interface.1.IPv4Address.1.IPAddress',
    ];

    for (const path of fallbackCandidates) {
      const candidate = this.pickString(device, [path]);

      if (!this.isValidIp(candidate)) continue;
      if (candidate === lanIp) continue;
      if (this.isCommonLanIp(candidate)) continue;

      return candidate;
    }

    return preferredWanIp || '-';
  }

  private isCommonLanIp(ip: string): boolean {
    if (!ip) return false;

    const normalized = ip.trim();

    return (
      normalized.startsWith('192.168.') ||
      normalized.startsWith('172.16.') ||
      normalized.startsWith('172.17.') ||
      normalized.startsWith('172.18.') ||
      normalized.startsWith('172.19.') ||
      normalized.startsWith('172.20.') ||
      normalized.startsWith('172.21.') ||
      normalized.startsWith('172.22.') ||
      normalized.startsWith('172.23.') ||
      normalized.startsWith('172.24.') ||
      normalized.startsWith('172.25.') ||
      normalized.startsWith('172.26.') ||
      normalized.startsWith('172.27.') ||
      normalized.startsWith('172.28.') ||
      normalized.startsWith('172.29.') ||
      normalized.startsWith('172.30.') ||
      normalized.startsWith('172.31.')
    );
  }

  private isValidIp(ip: string): boolean {
    if (!ip) return false;

    const normalized = ip.trim();

    if (!normalized || normalized === '-') return false;
    if (normalized === '0.0.0.0') return false;
    if (normalized.startsWith('127.')) return false;
    if (normalized.startsWith('169.254.')) return false;

    return /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized);
  }

  private getLanIp(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.IP.Interface.1.IPv4Address.1.IPAddress',
        'Device.DHCPv4.Server.Pool.1.IPRouters',
        'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPRouters',
        'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MinAddress',
      ]) || '-'
    );
  }

  private getPppoeUser(device: RawGenieACSDevice): string {
    return (
      this.pickString(device, [
        'Device.PPP.Interface.1.Username',
        'Device.PPP.Interface.2.Username',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      ]) || '-'
    );
  }

  private getWifiInfo(device: RawGenieACSDevice): DeviceWifiNetwork[] {
    const networks: DeviceWifiNetwork[] = [];

    const tr181AccessPointInstances = this.getInstanceKeys(
      device,
      'Device.WiFi.AccessPoint',
    );

    for (const apInstance of tr181AccessPointInstances) {
      const ssidReference = this.pickString(device, [
        `Device.WiFi.AccessPoint.${apInstance}.SSIDReference`,
      ]);

      const ssidInstance =
        ssidReference.match(/Device\.WiFi\.SSID\.(\d+)\.?/)?.[1] ||
        apInstance;

      const ssid =
        this.pickString(device, [
          `Device.WiFi.SSID.${ssidInstance}.SSID`,
          `Device.WiFi.AccessPoint.${apInstance}.SSID`,
        ]) || '-';

      const password =
        this.pickString(device, [
          `Device.WiFi.AccessPoint.${apInstance}.Security.KeyPassphrase`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.PreSharedKey`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.PreSharedKey.1.KeyPassphrase`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.PreSharedKey.1.PreSharedKey`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_TP_PreSharedKey`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_TP_KeyPassphrase`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_TP-Link_PreSharedKey`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_TP-Link_KeyPassphrase`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_CT-COM_KeyPassphrase`,
          `Device.WiFi.AccessPoint.${apInstance}.Security.X_CT-COM_PreSharedKey`,
        ]) || '';

      const enabledValue = this.resolveValue(
        this.getByPath(device, `Device.WiFi.AccessPoint.${apInstance}.Enable`),
      );

      const ssidEnabledValue = this.resolveValue(
        this.getByPath(device, `Device.WiFi.SSID.${ssidInstance}.Enable`),
      );

      const enabled =
        enabledValue !== null && enabledValue !== undefined
          ? Boolean(enabledValue)
          : ssidEnabledValue !== null && ssidEnabledValue !== undefined
            ? Boolean(ssidEnabledValue)
            : true;

      const frequency =
        this.pickString(device, [
          `Device.WiFi.SSID.${ssidInstance}.LowerLayers`,
          `Device.WiFi.AccessPoint.${apInstance}.OperatingFrequencyBand`,
        ]) || undefined;

      networks.push({
        instance: apInstance,
        ssid,
        password,
        enabled,
        standard: 'TR-181',
        frequency,
      });
    }

    const tr098WlanInstances = this.getInstanceKeys(
      device,
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration',
    );

    for (const instance of tr098WlanInstances) {
      const base = `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instance}`;

      const ssid = this.pickString(device, [`${base}.SSID`]) || '-';

      const password =
        this.pickString(device, [
          `${base}.KeyPassphrase`,
          `${base}.PreSharedKey.1.KeyPassphrase`,
          `${base}.PreSharedKey.1.PreSharedKey`,
          `${base}.PreSharedKey.1.Key`,
          `${base}.WEPKey.1.WEPKey`,
          `${base}.X_TP_PreSharedKey`,
          `${base}.X_TP_KeyPassphrase`,
          `${base}.X_TP-Link_PreSharedKey`,
          `${base}.X_TP-Link_KeyPassphrase`,
          `${base}.X_CT-COM_KeyPassphrase`,
          `${base}.X_CT-COM_PreSharedKey`,
        ]) || '';

      const enabledValue = this.resolveValue(
        this.getByPath(device, `${base}.Enable`),
      );

      const enabled =
        enabledValue !== null && enabledValue !== undefined
          ? Boolean(enabledValue)
          : true;

      networks.push({
        instance,
        ssid,
        password,
        enabled,
        standard: 'TR-098',
      });
    }

    const unique = new Map<string, DeviceWifiNetwork>();

    for (const network of networks) {
      const key = `${network.standard}-${network.instance}-${network.ssid}`;

      if (!unique.has(key)) {
        unique.set(key, network);
      }
    }

    return Array.from(unique.values());
  }

  private getHosts(device: RawGenieACSDevice): DeviceHost[] {
    const hosts: DeviceHost[] = [];

    const tr181Hosts = this.getInstanceKeys(device, 'Device.Hosts.Host');

    for (const instance of tr181Hosts) {
      const base = `Device.Hosts.Host.${instance}`;

      hosts.push({
        hostname: this.pickString(device, [`${base}.HostName`]) || '-',
        ip: this.pickString(device, [`${base}.IPAddress`]) || '-',
        mac: this.pickString(device, [`${base}.PhysAddress`]) || '-',
        active:
          String(this.resolveValue(this.getByPath(device, `${base}.Active`))) ===
          'true',
        interfaceType: this.pickString(device, [`${base}.Layer1Interface`]),
      });
    }

    const tr098Hosts = this.getInstanceKeys(
      device,
      'InternetGatewayDevice.LANDevice.1.Hosts.Host',
    );

    for (const instance of tr098Hosts) {
      const base = `InternetGatewayDevice.LANDevice.1.Hosts.Host.${instance}`;

      hosts.push({
        hostname: this.pickString(device, [`${base}.HostName`]) || '-',
        ip: this.pickString(device, [`${base}.IPAddress`]) || '-',
        mac: this.pickString(device, [`${base}.MACAddress`]) || '-',
        active:
          String(this.resolveValue(this.getByPath(device, `${base}.Active`))) ===
          'true',
        interfaceType: this.pickString(device, [`${base}.InterfaceType`]),
      });
    }

    return hosts;
  }

  private resolveUptime(device: RawGenieACSDevice): number | null {
    const uptime = this.pickString(device, [
      'Device.DeviceInfo.UpTime',
      'InternetGatewayDevice.DeviceInfo.UpTime',
    ]);

    if (!uptime) return null;

    const parsed = Number(uptime);

    if (Number.isNaN(parsed)) return null;

    return parsed;
  }

  private formatUptime(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return '-';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  private getConnectionRequestInfo(
    device: RawGenieACSDevice,
  ): DeviceConnectionRequestInfo {
    const tr181Url = this.resolveValue(
      this.getByPath(device, 'Device.ManagementServer.ConnectionRequestURL'),
    );

    const tr098Url = this.resolveValue(
      this.getByPath(
        device,
        'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      ),
    );

    const source: DeviceConnectionRequestSource = tr181Url
      ? 'Device'
      : tr098Url
        ? 'InternetGatewayDevice'
        : null;

    const usernamePath =
      source === 'Device'
        ? 'Device.ManagementServer.ConnectionRequestUsername'
        : 'InternetGatewayDevice.ManagementServer.ConnectionRequestUsername';

    const passwordPath =
      source === 'Device'
        ? 'Device.ManagementServer.ConnectionRequestPassword'
        : 'InternetGatewayDevice.ManagementServer.ConnectionRequestPassword';

    const username = source
      ? this.resolveValue(this.getByPath(device, usernamePath))
      : null;

    const passwordNode = source ? this.getByPath(device, passwordPath) : null;

    return {
      url: tr181Url ? String(tr181Url) : tr098Url ? String(tr098Url) : null,
      username: username ? String(username) : null,
      hasPassword: this.hasParameterStored(passwordNode),
      standard: this.detectStandard(device),
      source,
    };
  }

  private hasParameterStored(parameter: any): boolean {
    if (!parameter) return false;

    const value = this.resolveValue(parameter);

    if (value === null || value === undefined) {
      return Boolean(parameter && typeof parameter === 'object');
    }

    return String(value).trim().length > 0;
  }

  private getHeader(headers: Record<string, any>, name: string): string | null {
    const value = headers?.[name.toLowerCase()] || headers?.[name];

    if (!value) return null;

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  }

  private resolveAuthType(
    authHeader: string | null,
  ): 'Digest' | 'Basic' | 'None' | 'Unknown' {
    if (!authHeader) return 'None';

    const lower = authHeader.toLowerCase();

    if (lower.includes('digest')) return 'Digest';
    if (lower.includes('basic')) return 'Basic';

    return 'Unknown';
  }

  private getDeviceCapabilities(device: RawGenieACSDevice): DeviceCapability[] {
    const capabilities: DeviceCapability[] = [];

    const connectionRequest = this.getConnectionRequestInfo(device);
    const wifi = this.getWifiInfo(device);
    const hosts = this.getHosts(device);

    const hasReadableWifiPassword = wifi.some((network) =>
      this.isReadableSecret(network.password),
    );

    const hasWifiSsid = wifi.some(
      (network) => network.ssid && network.ssid !== '-',
    );

    const wifiSsidWritablePaths = [
      'Device.WiFi.SSID.1.SSID',
      'Device.WiFi.SSID.2.SSID',
      'Device.WiFi.SSID.3.SSID',
      'Device.WiFi.SSID.4.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.SSID',
    ].filter((item) => this.isParameterWritable(device, item));

    const wifiPasswordWritablePaths = [
      'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
      'Device.WiFi.AccessPoint.1.Security.PreSharedKey',
      'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
      'Device.WiFi.AccessPoint.2.Security.PreSharedKey',
      'Device.WiFi.AccessPoint.3.Security.KeyPassphrase',
      'Device.WiFi.AccessPoint.3.Security.PreSharedKey',
      'Device.WiFi.AccessPoint.4.Security.KeyPassphrase',
      'Device.WiFi.AccessPoint.4.Security.PreSharedKey',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.PreSharedKey.1.KeyPassphrase',
    ].filter((item) => this.isParameterWritable(device, item));

    const wifiEnableWritablePaths = [
      'Device.WiFi.AccessPoint.1.Enable',
      'Device.WiFi.AccessPoint.2.Enable',
      'Device.WiFi.AccessPoint.3.Enable',
      'Device.WiFi.AccessPoint.4.Enable',
      'Device.WiFi.SSID.1.Enable',
      'Device.WiFi.SSID.2.Enable',
      'Device.WiFi.SSID.3.Enable',
      'Device.WiFi.SSID.4.Enable',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.Enable',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.Enable',
    ].filter((item) => this.isParameterWritable(device, item));

    capabilities.push(
      this.capability({
        key: 'connection_request',
        label: 'Connection Request',
        status:
          connectionRequest.url &&
          connectionRequest.username &&
          connectionRequest.hasPassword
            ? 'supported'
            : connectionRequest.url
              ? 'partial'
              : 'unsupported',
        description:
          connectionRequest.url &&
          connectionRequest.username &&
          connectionRequest.hasPassword
            ? 'CPE possui URL, usuário e senha de Connection Request.'
            : connectionRequest.url
              ? 'CPE possui URL, mas credenciais podem estar incompletas.'
              : 'CPE não possui URL de Connection Request sincronizada.',
        source: connectionRequest.source || undefined,
        paths: connectionRequest.url
          ? [
              connectionRequest.source === 'InternetGatewayDevice'
                ? 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL'
                : 'Device.ManagementServer.ConnectionRequestURL',
            ]
          : [],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'remote_reboot',
        label: 'Reboot remoto',
        status: connectionRequest.url ? 'supported' : 'partial',
        description: connectionRequest.url
          ? 'Reboot pode ser enviado via Connection Request.'
          : 'Reboot pode ser enfileirado, mas depende do próximo Inform.',
        source: 'GenieACS task reboot',
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wifi_read_ssid',
        label: 'Ler SSID Wi-Fi',
        status: hasWifiSsid ? 'supported' : 'unsupported',
        description: hasWifiSsid
          ? 'SSID atual foi lido via TR-069.'
          : 'SSID não foi encontrado nos parâmetros sincronizados.',
        paths: [
          'Device.WiFi.SSID.*.SSID',
          'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.SSID',
        ],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wifi_read_password',
        label: 'Ler senha Wi-Fi',
        status: hasReadableWifiPassword ? 'supported' : 'unsupported',
        description: hasReadableWifiPassword
          ? 'Senha Wi-Fi foi retornada pelo CPE.'
          : 'O CPE expõe os campos de senha como vazios/ocultos. É possível alterar, mas não ler a senha atual nesse firmware.',
        paths: [
          'Device.WiFi.AccessPoint.*.Security.KeyPassphrase',
          'Device.WiFi.AccessPoint.*.Security.PreSharedKey',
          'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.KeyPassphrase',
        ],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wifi_write_ssid',
        label: 'Alterar SSID Wi-Fi',
        status: wifiSsidWritablePaths.length > 0 ? 'supported' : 'unknown',
        description:
          wifiSsidWritablePaths.length > 0
            ? 'CPE possui parâmetro de SSID gravável.'
            : 'Não foi identificado parâmetro gravável de SSID.',
        paths: wifiSsidWritablePaths,
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wifi_write_password',
        label: 'Alterar senha Wi-Fi',
        status:
          wifiPasswordWritablePaths.length > 0 ? 'supported' : 'unknown',
        description:
          wifiPasswordWritablePaths.length > 0
            ? 'CPE possui parâmetro de senha Wi-Fi gravável.'
            : 'Não foi identificado parâmetro gravável de senha Wi-Fi.',
        paths: wifiPasswordWritablePaths,
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wifi_enable_disable',
        label: 'Ativar/desativar Wi-Fi',
        status: wifiEnableWritablePaths.length > 0 ? 'supported' : 'unknown',
        description:
          wifiEnableWritablePaths.length > 0
            ? 'CPE possui parâmetro Enable gravável para Wi-Fi.'
            : 'Não foi identificado parâmetro Enable gravável.',
        paths: wifiEnableWritablePaths,
      }),
    );

    capabilities.push(
      this.capability({
        key: 'lan_hosts',
        label: 'Clientes conectados',
        status: hosts.length > 0 ? 'supported' : 'unknown',
        description:
          hosts.length > 0
            ? `${hosts.length} host(s) LAN foram encontrados.`
            : 'Nenhum host LAN foi encontrado nos parâmetros atuais.',
        paths: [
          'Device.Hosts.Host.*',
          'InternetGatewayDevice.LANDevice.1.Hosts.Host.*',
        ],
      }),
    );

    const secondarySsidPaths = [
      'Device.WiFi.SSID.2.SSID',
      'Device.WiFi.SSID.4.SSID',
      'Device.WiFi.AccessPoint.2.SSIDReference',
      'Device.WiFi.AccessPoint.4.SSIDReference',
    ].filter((item) => Boolean(this.getByPath(device, item)));

    const secondarySsidWritablePaths = [
      'Device.WiFi.SSID.2.Enable',
      'Device.WiFi.SSID.2.SSID',
      'Device.WiFi.SSID.4.Enable',
      'Device.WiFi.SSID.4.SSID',
      'Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled',
      'Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled',
    ].filter((item) => this.isParameterWritable(device, item));

    const guestSsidNames = [
      this.pickString(device, ['Device.WiFi.SSID.2.SSID']),
      this.pickString(device, ['Device.WiFi.SSID.4.SSID']),
      this.pickString(device, ['Device.WiFi.MultiAP.APDevice.1.Radio.1.AP.2.SSID']),
      this.pickString(device, ['Device.WiFi.MultiAP.APDevice.1.Radio.2.AP.2.SSID']),
    ].filter(Boolean);

    const hasGuestNetwork = guestSsidNames.some((name) =>
      /guest|visitante|convidado|tp-link_guest/i.test(name),
    );

    const isolationWritablePaths = [
      'Device.WiFi.Radio.1.IsolationEnable',
      'Device.WiFi.Radio.2.IsolationEnable',
      'Device.WiFi.AccessPoint.1.IsolationEnable',
      'Device.WiFi.AccessPoint.2.IsolationEnable',
      'Device.WiFi.AccessPoint.3.IsolationEnable',
      'Device.WiFi.AccessPoint.4.IsolationEnable',
      'Device.WiFi.AccessPoint.1.X_TP_IsolationEnable',
      'Device.WiFi.AccessPoint.2.X_TP_IsolationEnable',
      'Device.WiFi.AccessPoint.3.X_TP_IsolationEnable',
      'Device.WiFi.AccessPoint.4.X_TP_IsolationEnable',
    ].filter((item) => this.isParameterWritable(device, item));

    const ssidVlanWritablePaths = [
      'Device.WiFi.SSID.1.X_TP_VLANID',
      'Device.WiFi.SSID.2.X_TP_VLANID',
      'Device.WiFi.SSID.3.X_TP_VLANID',
      'Device.WiFi.SSID.4.X_TP_VLANID',
      'Device.WiFi.SSID.1.X_TP_VID',
      'Device.WiFi.SSID.2.X_TP_VID',
      'Device.WiFi.SSID.3.X_TP_VID',
      'Device.WiFi.SSID.4.X_TP_VID',
      'Device.WiFi.AccessPoint.1.X_TP_VLANID',
      'Device.WiFi.AccessPoint.2.X_TP_VLANID',
      'Device.WiFi.AccessPoint.3.X_TP_VLANID',
      'Device.WiFi.AccessPoint.4.X_TP_VLANID',
      'Device.WiFi.AccessPoint.1.VLANID',
      'Device.WiFi.AccessPoint.2.VLANID',
      'Device.WiFi.AccessPoint.3.VLANID',
      'Device.WiFi.AccessPoint.4.VLANID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_TP_VLANID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.X_TP_VLANID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.X_TP_VLANID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.X_TP_VLANID',
    ].filter((item) => this.isParameterWritable(device, item));

    const wanVlanWritablePaths = [
      'Device.Ethernet.VLANTermination.1.VLANID',
      'Device.Ethernet.VLANTermination.2.VLANID',
      'Device.Ethernet.VLANTermination.3.VLANID',
      'Device.Ethernet.VLANTermination.4.VLANID',
    ].filter((item) => this.isParameterWritable(device, item));

    capabilities.push(
      this.capability({
        key: 'secondary_ssid',
        label: 'SSID secundário',
        status:
          secondarySsidPaths.length > 0 || secondarySsidWritablePaths.length > 0
            ? 'supported'
            : 'unsupported',
        description:
          secondarySsidPaths.length > 0 || secondarySsidWritablePaths.length > 0
            ? 'O CPE possui SSIDs secundários/guest que podem ser ativados e renomeados.'
            : 'Não foram encontrados SSIDs secundários nos parâmetros atuais.',
        paths: [...secondarySsidPaths, ...secondarySsidWritablePaths],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'guest_network',
        label: 'Rede Guest',
        status: hasGuestNetwork ? 'supported' : 'partial',
        description: hasGuestNetwork
          ? `Foram encontrados SSIDs guest: ${guestSsidNames.join(', ')}.`
          : 'Há múltiplos SSIDs, mas o firmware não identifica explicitamente como Guest.',
        paths: [
          'Device.WiFi.SSID.2.SSID',
          'Device.WiFi.SSID.4.SSID',
          'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.SSID',
        ],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'guest_isolation',
        label: 'Isolamento Wi-Fi/Guest',
        status: isolationWritablePaths.length > 0 ? 'partial' : 'unknown',
        description:
          isolationWritablePaths.length > 0
            ? 'O CPE expõe parâmetro de isolamento, mas neste modelo parece ser por rádio, não necessariamente por SSID/VLAN.'
            : 'Nenhum parâmetro gravável de isolamento foi encontrado.',
        paths: isolationWritablePaths,
      }),
    );

    capabilities.push(
      this.capability({
        key: 'ssid_vlan',
        label: 'VLAN por SSID',
        status: ssidVlanWritablePaths.length > 0 ? 'supported' : 'unsupported',
        description:
          ssidVlanWritablePaths.length > 0
            ? 'O CPE expõe parâmetros graváveis de VLAN diretamente ligados ao SSID/AP.'
            : 'Este firmware não expõe VLAN por SSID via TR-069. Os parâmetros VLAN encontrados parecem pertencer à WAN/PPPoE.',
        paths:
          ssidVlanWritablePaths.length > 0
            ? ssidVlanWritablePaths
            : [
                'Procurado: Device.WiFi.SSID.*.X_TP_VLANID',
                'Procurado: Device.WiFi.AccessPoint.*.X_TP_VLANID',
                'Procurado: InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.X_TP_VLANID',
              ],
      }),
    );

    capabilities.push(
      this.capability({
        key: 'wan_vlan',
        label: 'VLAN WAN/PPPoE',
        status: wanVlanWritablePaths.length > 0 ? 'supported' : 'unknown',
        description:
          wanVlanWritablePaths.length > 0
            ? 'O CPE possui VLAN Termination gravável para a WAN. Atenção: isso não é VLAN por SSID e pode derrubar a conexão PPPoE se alterado incorretamente.'
            : 'Não foram encontrados parâmetros graváveis de VLAN WAN.',
        paths: wanVlanWritablePaths,
      }),
    );

    capabilities.push(
      this.capability({
        key: 'firmware_upgrade',
        label: 'Atualização de firmware',
        status: 'unknown',
        description:
          'Ainda não testado neste modelo. Será validado no módulo Firmware Manager.',
        source: 'Download task',
      }),
    );

    return capabilities;
  }

  private capability(input: DeviceCapability): DeviceCapability {
    const uniquePaths = Array.from(
      new Set((input.paths || []).filter((item) => Boolean(item))),
    );

    return {
      key: input.key,
      label: input.label,
      status: input.status,
      description: input.description,
      source: input.source,
      paths: uniquePaths,
    };
  }

  private isParameterWritable(device: RawGenieACSDevice, path: string): boolean {
    const parameter = this.getByPath(device, path);

    if (!parameter || typeof parameter !== 'object') return false;

    return parameter._writable === true;
  }

  private isReadableSecret(value: string | null | undefined): boolean {
    if (!value) return false;

    const normalized = String(value).trim();

    if (!normalized) return false;
    if (normalized === '-') return false;
    if (normalized.toLowerCase() === 'null') return false;
    if (normalized.toLowerCase() === 'undefined') return false;

    const isOnlyAsterisks =
      normalized.length > 0 &&
      normalized.split('').every((char) => char === '*');

    if (isOnlyAsterisks) return false;

    return true;
  }

  private getImportantParameters(
    device: RawGenieACSDevice,
  ): DeviceParameterInfo[] {
    const parameters: DeviceParameterInfo[] = [];

    const paths: { label: string; path: string }[] = [
      {
        label: 'Connection Request URL',
        path: 'Device.ManagementServer.ConnectionRequestURL',
      },
      {
        label: 'Connection Request User',
        path: 'Device.ManagementServer.ConnectionRequestUsername',
      },
      {
        label: 'Periodic Inform',
        path: 'Device.ManagementServer.PeriodicInformEnable',
      },
      {
        label: 'Periodic Inform Interval',
        path: 'Device.ManagementServer.PeriodicInformInterval',
      },
      {
        label: 'ACS URL',
        path: 'Device.ManagementServer.URL',
      },
      {
        label: 'TR-098 Connection Request URL',
        path: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      },
      {
        label: 'TR-098 Connection Request User',
        path: 'InternetGatewayDevice.ManagementServer.ConnectionRequestUsername',
      },
      {
        label: 'TR-098 Periodic Inform Interval',
        path: 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
      },
      {
        label: 'TR-098 ACS URL',
        path: 'InternetGatewayDevice.ManagementServer.URL',
      },
    ];

    for (const item of paths) {
      const value = this.resolveValue(this.getByPath(device, item.path));

      if (value !== null && value !== undefined && String(value).trim()) {
        parameters.push({
          label: item.label,
          value: String(value),
          path: item.path,
        });
      }
    }

    return parameters;
  }
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
