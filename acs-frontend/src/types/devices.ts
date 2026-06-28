// acs-frontend/src/types/devices.ts

export type DeviceStatus = 'online' | 'warning' | 'offline';

export type TrStandard = 'TR-098' | 'TR-181' | 'TR-098/TR-181' | 'DESCONHECIDO';

export type DeviceConnectionRequestSource =
  | 'Device'
  | 'InternetGatewayDevice'
  | null;

export type ConnectionRequestAuthType =
  | 'Digest'
  | 'Basic'
  | 'None'
  | 'Unknown';

export interface DeviceWifiNetwork {
  instance?: string;
  ssid: string;
  password: string;
  enabled: boolean;
  standard: TrStandard;
  frequency?: string;
}

export interface DeviceSummary {
  id: string;
  mac: string;
  serialNumber: string;
  oui: string;
  manufacturer: string;
  model: string;
  productClass: string;
  hardwareVersion: string;
  softwareVersion: string;
  ip: string;
  lanIp: string;
  pppoe: string;
  wifi: DeviceWifiNetwork[];
  lastContact: string | null;
  status: DeviceStatus;
  standard: TrStandard;
  tags: string[];
}

export interface DeviceHost {
  hostname: string;
  ip: string;
  mac: string;
  active: boolean;
  interfaceType?: string;
}

export interface DeviceParameterInfo {
  label: string;
  value: string;
  path?: string;
}

export interface DeviceConnectionRequestInfo {
  url: string | null;
  username: string | null;
  hasPassword: boolean;
  standard: TrStandard;
  source: DeviceConnectionRequestSource;
}

export interface DeviceConnectionRequestTestResult {
  url: string | null;
  reachable: boolean;
  statusCode: number | null;
  latencyMs: number;
  authType: ConnectionRequestAuthType;
  authHeader: string | null;
  server: string | null;
  testedAt: string;
  message: string;
  actionId?: string;
}

export type DeviceCapabilityStatus =
  | 'supported'
  | 'unsupported'
  | 'partial'
  | 'unknown';

export interface DeviceCapability {
  key: string;
  label: string;
  status: DeviceCapabilityStatus;
  description: string;
  source?: string;
  paths?: string[];
}

export interface DeviceDetails extends DeviceSummary {
  uptimeSeconds: number | null;
  uptimeFormatted: string;
  hostCount: number;
  activeHostCount: number;
  hosts: DeviceHost[];
  importantParameters: DeviceParameterInfo[];
  connectionRequest: DeviceConnectionRequestInfo;
  capabilities: DeviceCapability[];
}

export type DeviceActionType =
  | 'REBOOT'
  | 'REFRESH_OBJECT'
  | 'UPDATE_WIFI'
  | 'TEST_CONNECTION_REQUEST'
  | 'SET_PARAMETER_VALUES';

export type DeviceActionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type DeviceActionMethod =
  | 'CONNECTION_REQUEST'
  | 'NEXT_INFORM'
  | 'DIRECT_HTTP_TEST'
  | 'INTERNAL';

export interface DeviceAction {
  id: string;
  deviceId: string;
  deviceLabel: string | null;
  actionType: DeviceActionType;
  actionLabel: string;
  status: DeviceActionStatus;
  method: DeviceActionMethod;
  objectName: string | null;
  requestedByUserId: string | null;
  requestedByEmail: string | null;
  requestPayload: Record<string, any> | null;
  responsePayload: Record<string, any> | null;
  responseStatusCode: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}
