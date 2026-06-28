// acs-frontend/src/types/device-groups.ts

export interface DeviceGroupFilters {
  manufacturer?: string;
  model?: string;
  productClass?: string;
  status?: 'online' | 'warning' | 'offline';
  search?: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  filters: DeviceGroupFilters;
  tags: string[];
  status: 'active' | 'inactive';
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceGroupPreviewDevice {
  id: string;
  manufacturer: string;
  model: string;
  productClass: string;
  serialNumber: string;
  ip: string;
  lanIp: string;
  status: 'online' | 'warning' | 'offline';
  lastContact: string | null;
}

export interface DeviceGroupPreviewResponse {
  groupId: string;
  groupName: string;
  matchedCount: number;
  limit: number;
  devices: DeviceGroupPreviewDevice[];
}
