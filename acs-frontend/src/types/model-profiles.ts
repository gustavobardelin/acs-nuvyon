export type ModelProfileStatus = 'active' | 'draft' | 'deprecated';

export type ModelProfileRootObject =
  | 'Device'
  | 'InternetGatewayDevice'
  | 'mixed'
  | 'unknown';

export interface ModelProfile {
  id: string;
  displayName: string;
  manufacturer: string;
  model: string;
  productClass: string;
  rootObject: ModelProfileRootObject;
  status: ModelProfileStatus;
  parameterMap: Record<string, any>;
  capabilities: Record<string, any>;
  recommendedTemplates: string[];
  tags: string[];
  notes: string | null;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
