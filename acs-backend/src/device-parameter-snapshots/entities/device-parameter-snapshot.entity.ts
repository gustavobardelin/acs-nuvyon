import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface DeviceParameterSnapshotItem {
  path: string;
  value: string;
  type: string;
  writable: boolean;
  timestamp: string | null;
}

@Entity('device_parameter_snapshots')
export class DeviceParameterSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', default: 0 })
  parameterCount: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  parameters: DeviceParameterSnapshotItem[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
