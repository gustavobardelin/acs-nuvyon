export interface DeviceParameterExplorerItem {
  path: string;
  value: string;
  rawValue: unknown;
  type: string;
  writable: boolean;
  timestamp: string | null;
  hasValue: boolean;
  isObject: boolean;
}

export interface DeviceParameterExplorerResponse {
  deviceId: string;
  total: number;
  filtered: number;
  limit: number;
  parameters: DeviceParameterExplorerItem[];
}
