// acs-frontend/src/types/provisioning-templates.ts

export interface ProvisioningTemplateParameter {
  path: string;
  value: string | number | boolean;
  type: string;
}

export interface ProvisioningTemplate {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  model: string | null;
  productClass: string | null;
  parameters: ProvisioningTemplateParameter[];
  tags: string[];
  status: 'active' | 'inactive';
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
