import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DeviceAlertStateStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'SILENCED'
  | 'RESOLVED';

@Entity('device_alert_states')
export class DeviceAlertState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 500 })
  alertKey: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  severity: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'OPEN' })
  status: DeviceAlertStateStatus;

  @Column({ type: 'integer', default: 1 })
  occurrenceCount: number;

  @Column({ type: 'timestamp with time zone' })
  firstSeenAt: Date;

  @Column({ type: 'timestamp with time zone' })
  lastSeenAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  acknowledgedByEmail: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  silencedByEmail: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  silencedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  silencedUntil: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resolvedByEmail: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
