export type DeviceAlertSeverity = 'critical' | 'warning' | 'info';
export type DeviceAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'SILENCED'
  | 'RESOLVED';

export interface DeviceAlert {
  id: string;
  stateId: string;
  deviceId: string;
  severity: DeviceAlertSeverity;
  title: string;
  description: string;
  category:
    | 'connectivity'
    | 'inform'
    | 'identity'
    | 'ip'
    | 'health'
    | 'wifi'
    | 'system';
  status: DeviceAlertStatus;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedByEmail: string | null;
  acknowledgedAt: string | null;
  silencedByEmail: string | null;
  silencedAt: string | null;
  silencedUntil: string | null;
  note: string | null;
  resolvedByEmail: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  isActive: boolean;
  device: {
    id: string;
    manufacturer: string;
    model: string;
    productClass: string;
    serialNumber: string;
    ip: string;
    lanIp: string;
    status: string;
    lastContact: string | null;
  };
  createdAt: string;
}

export interface DeviceAlertSummary {
  total: number;
  open: number;
  acknowledged: number;
  silenced: number;
  critical: number;
  warning: number;
  info: number;
  affectedDevices: number;
  generatedAt: string;
}
