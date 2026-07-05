import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { DeviceMetadataService } from '../device-metadata/device-metadata.service';
import type { DeviceMetadata } from '../device-metadata/entities/device-metadata.entity';
import { applyOperationalAlertRules } from './operational-alert-rules';
import {
  DeviceAlertState,
  DeviceAlertStateStatus,
} from './entities/device-alert-state.entity';

export type DeviceAlertSeverity = 'critical' | 'warning' | 'info';

export interface LiveDeviceAlert {
  id: string;
  deviceId: string;
  defaultStatus?: DeviceAlertStateStatus;
  defaultNote?: string;
  severity: DeviceAlertSeverity;
  title: string;
  description: string;
  category:
    | 'connectivity'
    | 'inform'
    | 'identity'
    | 'ip'
    | 'health'
    | 'wifi'
    | 'system';
  device: {
    id: string;
    manufacturer: string;
    model: string;
    productClass: string;
    serialNumber: string;
    ip: string;
    lanIp: string;
    status: string;
    lastContact: string | null;
  };
  createdAt: string;
}

export interface DeviceAlert extends LiveDeviceAlert {
  stateId: string;
  status: DeviceAlertStateStatus;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedByEmail: string | null;
  acknowledgedAt: string | null;
  silencedByEmail: string | null;
  silencedAt: string | null;
  silencedUntil: string | null;
  note: string | null;
  resolvedByEmail: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  isActive: boolean;
}

@Injectable()
export class DeviceAlertsService {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly metadataService: DeviceMetadataService,
    @InjectRepository(DeviceAlertState)
    private readonly statesRepository: Repository<DeviceAlertState>,
  ) {}

  async findAll(filters?: {
    severity?: DeviceAlertSeverity;
    status?: DeviceAlertStateStatus;
    category?: string;
    q?: string;
    includeResolved?: boolean;
  }): Promise<DeviceAlert[]> {
    const liveAlerts = await this.buildLiveAlerts();
    const states = await this.syncStates(liveAlerts);

    const liveMap = new Map(liveAlerts.map((alert) => [alert.id, alert]));

    const merged = states.map((state) => {
      const live = liveMap.get(state.alertKey);

      const base: LiveDeviceAlert =
        live ||
        ({
          id: state.alertKey,
          deviceId: state.deviceId,
          severity: state.severity as DeviceAlertSeverity,
          category: state.category as any,
          title: state.title,
          description: state.description,
          createdAt: state.createdAt.toISOString(),
          device: {
            id: state.deviceId,
            manufacturer: '-',
            model: '-',
            productClass: '-',
            serialNumber: '-',
            ip: '-',
            lanIp: '-',
            status: '-',
            lastContact: null,
          },
        } as LiveDeviceAlert);

      return this.mergeAlertWithState(base, state, Boolean(live));
    });

    return merged
      .filter((alert) => {
        if (!filters?.includeResolved && alert.status === 'RESOLVED') {
          return false;
        }

        if (filters?.severity && alert.severity !== filters.severity) {
          return false;
        }

        if (filters?.status && alert.status !== filters.status) {
          return false;
        }

        if (filters?.category && alert.category !== filters.category) {
          return false;
        }

        if (filters?.q?.trim()) {
          const q = filters.q.trim().toLowerCase();

          const haystack = [
            alert.title,
            alert.description,
            alert.device.id,
            alert.device.manufacturer,
            alert.device.model,
            alert.device.productClass,
            alert.device.serialNumber,
            alert.device.ip,
            alert.device.lanIp,
            alert.device.status,
            alert.status,
            alert.note,
            alert.resolutionNote,
          ]
            .map((item) => String(item || '').toLowerCase())
            .join(' ');

          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const statusOrder = {
          OPEN: 0,
          ACKNOWLEDGED: 1,
          SILENCED: 2,
          RESOLVED: 3,
        };

        const severityOrder = {
          critical: 0,
          warning: 1,
          info: 2,
        };

        const statusDiff = statusOrder[a.status] - statusOrder[b.status];

        if (statusDiff !== 0) return statusDiff;

        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  async summary() {
    const alerts = await this.findAll({ includeResolved: false });

    const operationalAlerts = alerts.filter(
      (alert) => alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED',
    );

    const silenced = alerts.filter((alert) => alert.status === 'SILENCED');
    const open = alerts.filter((alert) => alert.status === 'OPEN');
    const acknowledged = alerts.filter(
      (alert) => alert.status === 'ACKNOWLEDGED',
    );

    const critical = operationalAlerts.filter(
      (alert) => alert.severity === 'critical',
    );

    const warning = operationalAlerts.filter(
      (alert) => alert.severity === 'warning',
    );

    const info = operationalAlerts.filter((alert) => alert.severity === 'info');

    const uniqueDevices = new Set(
      operationalAlerts.map((alert) => alert.deviceId),
    );

    return {
      total: operationalAlerts.length,
      open: open.length,
      acknowledged: acknowledged.length,
      silenced: silenced.length,
      critical: critical.length,
      warning: warning.length,
      info: info.length,
      affectedDevices: uniqueDevices.size,
      generatedAt: new Date().toISOString(),
    };
  }

  async acknowledge(
    alertKey: string,
    actor: { email: string | null },
    note?: string,
  ) {
    const state = await this.findStateByAlertKey(alertKey);

    state.status = 'ACKNOWLEDGED';
    state.acknowledgedByEmail = actor.email;
    state.acknowledgedAt = new Date();
    state.note = note?.trim() || state.note || null;

    return this.statesRepository.save(state);
  }

  async silence(
    alertKey: string,
    actor: { email: string | null },
    reason?: string,
    silencedUntil?: string,
  ) {
    const state = await this.findStateByAlertKey(alertKey);

    state.status = 'SILENCED';
    state.silencedByEmail = actor.email;
    state.silencedAt = new Date();
    state.silencedUntil = silencedUntil ? new Date(silencedUntil) : null;
    state.note = reason?.trim() || state.note || null;

    return this.statesRepository.save(state);
  }

  async resolve(
    alertKey: string,
    actor: { email: string | null },
    note?: string,
  ) {
    const state = await this.findStateByAlertKey(alertKey);

    state.status = 'RESOLVED';
    state.resolvedByEmail = actor.email;
    state.resolvedAt = new Date();
    state.resolutionNote = note?.trim() || null;

    return this.statesRepository.save(state);
  }

  async reopen(alertKey: string) {
    const state = await this.findStateByAlertKey(alertKey);

    state.status = 'OPEN';
    state.acknowledgedAt = null;
    state.acknowledgedByEmail = null;
    state.silencedAt = null;
    state.silencedByEmail = null;
    state.silencedUntil = null;
    state.resolvedAt = null;
    state.resolvedByEmail = null;
    state.resolutionNote = null;

    return this.statesRepository.save(state);
  }

  private async findStateByAlertKey(alertKey: string) {
    const state = await this.statesRepository.findOne({
      where: { alertKey },
    });

    if (!state) {
      throw new NotFoundException('Alerta não encontrado.');
    }

    return state;
  }

  private async buildLiveAlerts(): Promise<LiveDeviceAlert[]> {
    const devices = await this.devicesService.findAll();
    const alerts: LiveDeviceAlert[] = [];

    const metadataPairs = await Promise.all(
      devices.map(async (device: any) => {
        const metadata = await this.metadataService.findExistingByDeviceId(
          device.id,
        );

        return [device.id, metadata] as const;
      }),
    );

    const metadataByDeviceId = new Map(metadataPairs);

    for (const device of devices) {
      const metadata = metadataByDeviceId.get(device.id);
      const deviceAlerts = this.buildDeviceAlerts(device, metadata).map((alert) =>
        applyOperationalAlertRules(alert, metadata),
      );

      alerts.push(...deviceAlerts);
    }

    return alerts;
  }

  private async syncStates(
    liveAlerts: LiveDeviceAlert[],
  ): Promise<DeviceAlertState[]> {
    const liveKeys = liveAlerts.map((alert) => alert.id);
    const now = new Date();

    const existingStates = liveKeys.length
      ? await this.statesRepository.find({
          where: { alertKey: In(liveKeys) },
        })
      : [];

    const existingMap = new Map(
      existingStates.map((state) => [state.alertKey, state]),
    );

    for (const alert of liveAlerts) {
      const existing = existingMap.get(alert.id);

      if (!existing) {
        const state = this.statesRepository.create({
          alertKey: alert.id,
          deviceId: alert.deviceId,
          severity: alert.severity,
          category: alert.category,
          title: alert.title,
          description: alert.description,
          status: alert.defaultStatus || 'OPEN',
          occurrenceCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          acknowledgedByEmail:
            alert.defaultStatus === 'ACKNOWLEDGED' ? 'system' : null,
          acknowledgedAt: alert.defaultStatus === 'ACKNOWLEDGED' ? now : null,
          silencedByEmail:
            alert.defaultStatus === 'SILENCED' ? 'system' : null,
          silencedAt: alert.defaultStatus === 'SILENCED' ? now : null,
          silencedUntil: null,
          note: alert.defaultNote || null,
          resolvedByEmail: null,
          resolvedAt: null,
          resolutionNote: null,
        });

        await this.statesRepository.save(state);
        continue;
      }

      existing.severity = alert.severity;
      existing.category = alert.category;
      existing.title = alert.title;
      existing.description = alert.description;
      existing.lastSeenAt = now;
      existing.occurrenceCount = Number(existing.occurrenceCount || 0) + 1;

      if (existing.status === 'RESOLVED') {
        existing.status = 'OPEN';
        existing.resolvedAt = null;
        existing.resolvedByEmail = null;
        existing.resolutionNote = null;
      }

      if (
        existing.status === 'SILENCED' &&
        existing.silencedUntil &&
        existing.silencedUntil.getTime() < Date.now()
      ) {
        existing.status = 'OPEN';
        existing.silencedAt = null;
        existing.silencedByEmail = null;
        existing.silencedUntil = null;
      }

      const wasAutoSilencedByOperationalRule =
        existing.status === 'SILENCED' &&
        (existing.silencedByEmail === 'system' ||
          String(existing.note || '').startsWith(
            'Silenciado automaticamente:',
          ));

      if (
        alert.defaultStatus !== 'SILENCED' &&
        wasAutoSilencedByOperationalRule
      ) {
        existing.status = 'OPEN';
        existing.silencedAt = null;
        existing.silencedByEmail = null;
        existing.silencedUntil = null;
        existing.note = null;
      }

      if (
        alert.defaultStatus === 'SILENCED' &&
        (existing.status === 'OPEN' || existing.status === 'ACKNOWLEDGED')
      ) {
        existing.status = 'SILENCED';
        existing.silencedAt = existing.silencedAt || now;
        existing.silencedByEmail = existing.silencedByEmail || 'system';
        existing.silencedUntil = null;
        existing.note = alert.defaultNote || existing.note || null;
      }

      if (
        alert.defaultStatus === 'ACKNOWLEDGED' &&
        existing.status === 'OPEN'
      ) {
        existing.status = 'ACKNOWLEDGED';
        existing.acknowledgedAt = existing.acknowledgedAt || now;
        existing.acknowledgedByEmail =
          existing.acknowledgedByEmail || 'system';
        existing.note = alert.defaultNote || existing.note || null;
      }

      await this.statesRepository.save(existing);
    }

    const allStates = await this.statesRepository.find({
      order: {
        updatedAt: 'DESC',
      },
      take: 500,
    });

    const liveKeySet = new Set(liveKeys);

    for (const state of allStates) {
      if (
        !liveKeySet.has(state.alertKey) &&
        (state.status === 'OPEN' || state.status === 'ACKNOWLEDGED')
      ) {
        state.status = 'RESOLVED';
        state.resolvedAt = now;
        state.resolutionNote = 'Resolvido automaticamente: alerta não está mais ativo.';
        await this.statesRepository.save(state);
      }
    }

    return this.statesRepository.find({
      order: {
        updatedAt: 'DESC',
      },
      take: 500,
    });
  }

  private mergeAlertWithState(
    alert: LiveDeviceAlert,
    state: DeviceAlertState,
    isActive: boolean,
  ): DeviceAlert {
    return {
      ...alert,
      stateId: state.id,
      status: state.status,
      occurrenceCount: state.occurrenceCount,
      firstSeenAt: state.firstSeenAt.toISOString(),
      lastSeenAt: state.lastSeenAt.toISOString(),
      acknowledgedByEmail: state.acknowledgedByEmail,
      acknowledgedAt: state.acknowledgedAt?.toISOString() || null,
      silencedByEmail: state.silencedByEmail,
      silencedAt: state.silencedAt?.toISOString() || null,
      silencedUntil: state.silencedUntil?.toISOString() || null,
      note: state.note,
      resolvedByEmail: state.resolvedByEmail,
      resolvedAt: state.resolvedAt?.toISOString() || null,
      resolutionNote: state.resolutionNote,
      isActive,
    };
  }

  private buildDeviceAlerts(
    device: any,
    metadata?: DeviceMetadata | null,
  ): LiveDeviceAlert[] {
    const alerts: LiveDeviceAlert[] = [];
    const now = new Date().toISOString();

    const devicePreview = {
      id: device.id,
      manufacturer: device.manufacturer || '-',
      model: device.model || '-',
      productClass: device.productClass || '-',
      serialNumber: device.serialNumber || '-',
      ip: device.ip || '-',
      lanIp: device.lanIp || '-',
      status: device.status || '-',
      lastContact: device.lastContact || null,
    };

    const lastContactMinutes = this.minutesSince(device.lastContact);
    if (device.status === 'offline') {
      alerts.push({
        id: `${device.id}:offline`,
        deviceId: device.id,
        severity: 'critical',
        category: 'connectivity',
        title: 'CPE offline',
        description:
          'O dispositivo está offline ou sem inform dentro do limite operacional.',
        device: devicePreview,
        createdAt: now,
      });
    }

    if (device.status === 'warning') {
      alerts.push({
        id: `${device.id}:warning-status`,
        deviceId: device.id,
        severity: 'warning',
        category: 'inform',
        title: 'CPE em atenção',
        description:
          'O dispositivo possui contato recente, mas o último inform está fora do ideal.',
        device: devicePreview,
        createdAt: now,
      });
    }

    if (lastContactMinutes === null) {
      alerts.push({
        id: `${device.id}:missing-last-contact`,
        deviceId: device.id,
        severity: 'critical',
        category: 'inform',
        title: 'Sem informação de último inform',
        description:
          'O ACS não conseguiu identificar quando o dispositivo informou pela última vez.',
        device: devicePreview,
        createdAt: now,
      });
    } else if (lastContactMinutes > 120) {
      alerts.push({
        id: `${device.id}:last-contact-over-2h`,
        deviceId: device.id,
        severity: 'critical',
        category: 'inform',
        title: 'Último inform acima de 2 horas',
        description: `Último inform há aproximadamente ${Math.round(
          lastContactMinutes,
        )} minutos.`,
        device: devicePreview,
        createdAt: now,
      });
    } else if (lastContactMinutes > 15) {
      alerts.push({
        id: `${device.id}:last-contact-over-15m`,
        deviceId: device.id,
        severity: 'warning',
        category: 'inform',
        title: 'Último inform acima de 15 minutos',
        description: `Último inform há aproximadamente ${Math.round(
          lastContactMinutes,
        )} minutos.`,
        device: devicePreview,
        createdAt: now,
      });
    }

    if (!this.isValidIp(device.ip)) {
      alerts.push({
        id: `${device.id}:invalid-wan-ip`,
        deviceId: device.id,
        severity: 'warning',
        category: 'ip',
        title: 'IP WAN inválido ou ausente',
        description:
          'O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.',
        device: devicePreview,
        createdAt: now,
      });
    }

    if (!device.serialNumber || device.serialNumber === '-') {
      alerts.push({
        id: `${device.id}:missing-serial`,
        deviceId: device.id,
        severity: 'warning',
        category: 'identity',
        title: 'Serial não identificado',
        description:
          'O número de série do equipamento não foi identificado corretamente.',
        device: devicePreview,
        createdAt: now,
      });
    }

    if (!device.model || device.model === '-') {
      alerts.push({
        id: `${device.id}:missing-model`,
        deviceId: device.id,
        severity: 'warning',
        category: 'identity',
        title: 'Modelo não identificado',
        description:
          'O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.',
        device: devicePreview,
        createdAt: now,
      });
    }

    return alerts;
  }

  private minutesSince(value: string | null | undefined): number | null {
    if (!value) return null;

    const parsed = new Date(value).getTime();

    if (Number.isNaN(parsed)) return null;

    return Math.max(0, (Date.now() - parsed) / 1000 / 60);
  }

  private isValidIp(ip: string | null | undefined): boolean {
    if (!ip) return false;

    const normalized = String(ip).trim();

    if (!normalized || normalized === '-') return false;
    if (normalized === '0.0.0.0') return false;
    if (normalized.startsWith('127.')) return false;
    if (normalized.startsWith('169.254.')) return false;

    return /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized);
  }
}
