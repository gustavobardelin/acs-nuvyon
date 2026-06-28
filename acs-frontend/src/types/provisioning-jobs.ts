export type ProvisioningJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

export interface ProvisioningJob {
  id: string;
  name: string;
  description: string | null;
  groupId: string;
  groupName: string;
  templateId: string;
  templateName: string;
  status: ProvisioningJobStatus;
  targetCount: number;
  successCount: number;
  failedCount: number;
  limit: number;
  requestPayload: Record<string, any>;
  resultPayload: Record<string, any> | null;
  errorMessage: string | null;
  createdByEmail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}
