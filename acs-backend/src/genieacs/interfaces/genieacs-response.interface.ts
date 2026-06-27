export interface GenieACSDevice {
  _id: string;
  _lastBoot?: string;
  _registered?: string;
  _tags?: string[];
  InternetGatewayDevice?: Record<string, any>;
  Device?: Record<string, any>;
  [key: string]: any; 
}

export interface GenieACSTaskResponse {
  _id: string;
  name: string;
  device: string;
  timestamp: string;
}