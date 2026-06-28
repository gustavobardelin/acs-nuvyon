import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ProvisioningJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

@Entity('provisioning_jobs')
export class ProvisioningJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'varchar', length: 180 })
  groupName: string;

  @Index()
  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'varchar', length: 180 })
  templateName: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: ProvisioningJobStatus;

  @Column({ type: 'integer', default: 0 })
  targetCount: number;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failedCount: number;

  @Column({ type: 'integer', default: 20 })
  limit: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  requestPayload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  resultPayload: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
