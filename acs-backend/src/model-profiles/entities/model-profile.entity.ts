import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ModelProfileStatus = 'active' | 'draft' | 'deprecated';

export type ModelProfileRootObject =
  | 'Device'
  | 'InternetGatewayDevice'
  | 'mixed'
  | 'unknown';

export interface ModelProfileParameterMap {
  wifi2gSsid?: string;
  wifi2gPassword?: string;
  wifi5gSsid?: string;
  wifi5gPassword?: string;
  guest2gEnable?: string;
  guest2gSsid?: string;
  guest2gPassword?: string;
  guest5gEnable?: string;
  guest5gSsid?: string;
  guest5gPassword?: string;
  periodicInformEnable?: string;
  periodicInformInterval?: string;
  connectionRequestUrl?: string;
  wanIp?: string;
  pppUsername?: string;
  vlanWan?: string;
  firmwareVersion?: string;
}

export interface ModelProfileCapabilities {
  connectionRequest?: boolean;
  reboot?: boolean;
  wifiRead?: boolean;
  wifiWrite?: boolean;
  wifiPasswordRead?: boolean;
  wifiPasswordWrite?: boolean;
  guestWifi?: boolean;
  vlanBySsid?: boolean;
  wanVlan?: boolean;
  firmwareUpgrade?: boolean;
  hostsRead?: boolean;
}

@Index('IDX_model_profiles_unique_model', ['manufacturer', 'model', 'productClass'], {
  unique: true,
})
@Entity('model_profiles')
export class ModelProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  displayName: string;

  @Index()
  @Column({ type: 'varchar', length: 120, default: '-' })
  manufacturer: string;

  @Index()
  @Column({ type: 'varchar', length: 160, default: '-' })
  model: string;

  @Index()
  @Column({ type: 'varchar', length: 160, default: '-' })
  productClass: string;

  @Column({ type: 'varchar', length: 40, default: 'unknown' })
  rootObject: ModelProfileRootObject;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'active' })
  status: ModelProfileStatus;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  parameterMap: ModelProfileParameterMap;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  capabilities: ModelProfileCapabilities;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  recommendedTemplates: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedByEmail: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
