import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DeviceGroupStatus = 'active' | 'inactive';

export interface DeviceGroupFilters {
  manufacturer?: string;
  model?: string;
  productClass?: string;
  status?: 'online' | 'warning' | 'offline';
  search?: string;
}

@Entity('device_groups')
export class DeviceGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  filters: DeviceGroupFilters;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: DeviceGroupStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
