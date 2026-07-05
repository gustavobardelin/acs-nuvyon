export interface DeviceParameterSnapshotItem {
  path: string;
  value: string;
  type: string;
  writable: boolean;
  timestamp: string | null;
}

export interface DeviceParameterSnapshot {
  id: string;
  deviceId: string;
  name: string;
  description: string | null;
  parameterCount: number;
  parameters: DeviceParameterSnapshotItem[];
  createdByEmail: string | null;
  createdAt: string;
}

export interface DeviceParameterDiffItem {
  path: string;
  before: DeviceParameterSnapshotItem | null;
  after: DeviceParameterSnapshotItem | null;
  changeType: 'added' | 'removed' | 'changed';
  changedFields: string[];
}

export interface DeviceParameterDiffResponse {
  baseSnapshot: {
    id: string;
    name: string;
    deviceId: string;
    parameterCount: number;
    createdAt: string;
  };
  targetSnapshot: {
    id: string;
    name: string;
    deviceId: string;
    parameterCount: number;
    createdAt: string;
  };
  summary: {
    totalChanges: number;
    added: number;
    removed: number;
    changed: number;
  };
  changes: DeviceParameterDiffItem[];
}
