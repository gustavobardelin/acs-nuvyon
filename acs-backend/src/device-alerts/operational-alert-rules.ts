import type { DeviceMetadata } from '../device-metadata/entities/device-metadata.entity';
import type {
  DeviceAlertSeverity,
  LiveDeviceAlert,
} from './device-alerts.service';
import type { DeviceAlertStateStatus } from './entities/device-alert-state.entity';

export interface OperationalAlertRuleResult {
  matched: boolean;
  severity?: DeviceAlertSeverity;
  defaultStatus?: DeviceAlertStateStatus;
  note?: string;
  title?: string;
  description?: string;
}

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function hasAnyTag(metadata: DeviceMetadata | null | undefined, tags: string[]) {
  const metadataTags = Array.isArray(metadata?.tags)
    ? metadata.tags.map((tag) => normalize(tag))
    : [];

  return tags.some((tag) => metadataTags.includes(normalize(tag)));
}

export function applyOperationalAlertRules(
  alert: LiveDeviceAlert,
  metadata?: DeviceMetadata | null,
): LiveDeviceAlert {
  const operationalMode = normalize(metadata?.operationalMode || 'unknown');
  const result = evaluateOperationalAlertRule(alert, metadata);

  if (!result.matched) {
    return alert;
  }

  return {
    ...alert,
    severity: result.severity || alert.severity,
    defaultStatus: result.defaultStatus || alert.defaultStatus,
    defaultNote: result.note || alert.defaultNote,
    title: result.title || alert.title,
    description: result.description || alert.description,
  };
}

export function evaluateOperationalAlertRule(
  alert: LiveDeviceAlert,
  metadata?: DeviceMetadata | null,
): OperationalAlertRuleResult {
  const operationalMode = normalize(metadata?.operationalMode || 'unknown');

  const isIpAlert = alert.category === 'ip';
  const isConnectivityAlert = alert.category === 'connectivity';

  const expectedMissingWanByMode = ['lab', 'ap', 'bridge', 'maintenance'].includes(
    operationalMode,
  );

  const expectedMissingWanByTag = hasAnyTag(metadata, [
    'lab',
    'laboratorio',
    'laboratório',
    'bancada',
    'teste',
    'ap',
    'bridge',
  ]);

  if (isIpAlert && (expectedMissingWanByMode || expectedMissingWanByTag)) {
    const source = expectedMissingWanByMode
      ? `modo operacional ${operationalMode}`
      : 'tag operacional';

    return {
      matched: true,
      severity: 'info',
      defaultStatus: 'SILENCED',
      note: `Silenciado automaticamente: ${source}.`,
      title: 'IP WAN ausente esperado pelo contexto operacional',
      description:
        'O CPE está em um contexto operacional onde a ausência de IP WAN pode ser esperada. Esse alerta foi classificado como informativo para evitar falso positivo no NOC.',
    };
  }

  if (isConnectivityAlert && operationalMode === 'maintenance') {
    return {
      matched: true,
      severity: 'warning',
      defaultStatus: 'ACKNOWLEDGED',
      note: 'Reconhecido automaticamente: CPE em manutenção.',
      title: 'CPE offline durante manutenção',
      description:
        'O CPE está em modo manutenção. O alerta de conectividade foi reduzido para atenção e reconhecido automaticamente.',
    };
  }

  return {
    matched: false,
  };
}
