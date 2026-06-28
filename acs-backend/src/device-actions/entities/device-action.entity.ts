// acs-backend/src/device-actions/entities/device-action.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DeviceActionType {
  REBOOT = 'REBOOT',
  REFRESH_OBJECT = 'REFRESH_OBJECT',
  UPDATE_WIFI = 'UPDATE_WIFI',
  TEST_CONNECTION_REQUEST = 'TEST_CONNECTION_REQUEST',
  SET_PARAMETER_VALUES = 'SET_PARAMETER_VALUES',
}

export enum DeviceActionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum DeviceActionMethod {
  CONNECTION_REQUEST = 'CONNECTION_REQUEST',
  NEXT_INFORM = 'NEXT_INFORM',
  DIRECT_HTTP_TEST = 'DIRECT_HTTP_TEST',
  INTERNAL = 'INTERNAL',
}

@Entity('device_actions')
export class DeviceAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceLabel: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: DeviceActionType,
  })
  actionType: DeviceActionType;

  @Column({ type: 'varchar', length: 255 })
  actionLabel: string;

  @Index()
  @Column({
    type: 'enum',
    enum: DeviceActionStatus,
    default: DeviceActionStatus.PENDING,
  })
  status: DeviceActionStatus;

  @Column({
    type: 'enum',
    enum: DeviceActionMethod,
    default: DeviceActionMethod.CONNECTION_REQUEST,
  })
  method: DeviceActionMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  objectName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requestedByUserId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requestedByEmail: string | null;

  @Column({ type: 'jsonb', nullable: true })
  requestPayload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  responsePayload: Record<string, any> | null;

  @Column({ type: 'integer', nullable: true })
  responseStatusCode: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
