// acs-backend/src/provisioning-templates/entities/provisioning-template.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ProvisioningTemplateStatus = 'active' | 'inactive';

export interface ProvisioningTemplateParameter {
  path: string;
  value: string | number | boolean;
  type: string;
}

@Entity('provisioning_templates')
export class ProvisioningTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  vendor: string | null;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  model: string | null;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  productClass: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  parameters: ProvisioningTemplateParameter[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ProvisioningTemplateStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
