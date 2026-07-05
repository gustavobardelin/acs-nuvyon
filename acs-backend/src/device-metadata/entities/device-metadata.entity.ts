import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DeviceOperationalMode =
  | 'unknown'
  | 'production'
  | 'lab'
  | 'ap'
  | 'bridge'
  | 'maintenance';

@Entity('device_metadata')
export class DeviceMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  customerCode: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Index()
  @Column({ type: 'varchar', length: 40, default: 'unknown' })
  operationalMode: DeviceOperationalMode;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedByEmail: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
