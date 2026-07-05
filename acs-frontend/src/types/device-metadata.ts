export type DeviceOperationalMode =
  | 'unknown'
  | 'production'
  | 'lab'
  | 'ap'
  | 'bridge'
  | 'maintenance';

export interface DeviceMetadata {
  id: string | null;
  deviceId: string;
  label: string | null;
  customerName: string | null;
  customerCode: string | null;
  city: string | null;
  address: string | null;
  operationalMode: DeviceOperationalMode;
  tags: string[];
  notes: string | null;
  updatedByEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
