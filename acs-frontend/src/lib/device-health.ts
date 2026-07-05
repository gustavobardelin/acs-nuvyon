import { DeviceDetails, DeviceSummary } from '@/types/devices';

export type DeviceHealthLevel = 'healthy' | 'attention' | 'critical';

export interface DeviceHealthIssue {
  key: string;
  label: string;
  severity: 'info' | 'warning' | 'critical';
  points: number;
  description: string;
}

export interface DeviceHealthResult {
  score: number;
  level: DeviceHealthLevel;
  label: string;
  issues: DeviceHealthIssue[];
  calculatedAt: string;
}

type OperationalMode =
  | 'unknown'
  | 'production'
  | 'lab'
  | 'ap'
  | 'bridge'
  | 'maintenance';

type AnyDevice = Partial<DeviceSummary & DeviceDetails> &
  Record<string, any> & {
    operationalMode?: OperationalMode;
  };

function isValidIp(ip: string | null | undefined): boolean {
  if (!ip) return false;

  const normalized = String(ip).trim();

  if (!normalized || normalized === '-') return false;
  if (normalized === '0.0.0.0') return false;
  if (normalized.startsWith('127.')) return false;
  if (normalized.startsWith('169.254.')) return false;

  return /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized);
}

function isExpectedMissingWanMode(mode: string | null | undefined): boolean {
  return ['lab', 'ap', 'bridge', 'maintenance'].includes(String(mode || ''));
}

function minutesSince(value: string | null | undefined): number | null {
  if (!value) return null;

  const parsed = new Date(value).getTime();

  if (Number.isNaN(parsed)) return null;

  return Math.max(0, (Date.now() - parsed) / 1000 / 60);
}

function addIssue(
  issues: DeviceHealthIssue[],
  input: DeviceHealthIssue,
): number {
  issues.push(input);
  return input.points;
}

export function calculateDeviceHealth(device: AnyDevice): DeviceHealthResult {
  const issues: DeviceHealthIssue[] = [];
  let score = 100;

  const status = String(device.status || '').toLowerCase();
  const lastContactMinutes = minutesSince(device.lastContact);

  if (status === 'offline') {
    score -= addIssue(issues, {
      key: 'offline',
      label: 'CPE offline',
      severity: 'critical',
      points: 50,
      description: 'O dispositivo está sem inform dentro do limite operacional.',
    });
  } else if (status === 'warning') {
    score -= addIssue(issues, {
      key: 'warning',
      label: 'Inform atrasado',
      severity: 'warning',
      points: 20,
      description: 'O dispositivo ainda tem contato recente, mas está fora do ideal.',
    });
  }

  if (lastContactMinutes === null) {
    score -= addIssue(issues, {
      key: 'missing_last_contact',
      label: 'Sem último inform',
      severity: 'critical',
      points: 25,
      description: 'Não foi possível identificar o último contato do CPE.',
    });
  } else if (lastContactMinutes > 120) {
    score -= addIssue(issues, {
      key: 'last_contact_over_2h',
      label: 'Último inform acima de 2h',
      severity: 'critical',
      points: 25,
      description: `Último inform há aproximadamente ${Math.round(
        lastContactMinutes,
      )} minutos.`,
    });
  } else if (lastContactMinutes > 15) {
    score -= addIssue(issues, {
      key: 'last_contact_over_15m',
      label: 'Último inform acima de 15min',
      severity: 'warning',
      points: 10,
      description: `Último inform há aproximadamente ${Math.round(
        lastContactMinutes,
      )} minutos.`,
    });
  }

  const operationalMode = device.operationalMode || 'unknown';
  const expectedMissingWan = isExpectedMissingWanMode(operationalMode);

  if (!isValidIp(device.ip)) {
    if (expectedMissingWan) {
      addIssue(issues, {
        key: 'expected_missing_wan_ip',
        label: 'IP WAN ausente esperado',
        severity: 'info',
        points: 0,
        description: `O CPE está em modo operacional ${operationalMode}. Nesse cenário, ausência de IP WAN pode ser esperada.`,
      });
    } else {
      score -= addIssue(issues, {
        key: 'invalid_wan_ip',
        label: 'IP WAN inválido ou ausente',
        severity: 'warning',
        points: 15,
        description: 'O ACS não identificou um IP WAN válido para o CPE.',
      });
    }
  }

  if (!device.serialNumber || device.serialNumber === '-') {
    score -= addIssue(issues, {
      key: 'missing_serial',
      label: 'Serial não identificado',
      severity: 'warning',
      points: 8,
      description: 'O serial do equipamento não foi identificado corretamente.',
    });
  }

  if (!device.model || device.model === '-') {
    score -= addIssue(issues, {
      key: 'missing_model',
      label: 'Modelo não identificado',
      severity: 'warning',
      points: 7,
      description: 'O modelo do CPE não foi identificado pelo ACS.',
    });
  }

  const connectionRequestUrl =
    device.connectionRequest?.url ||
    device.connectionRequest?.connectionRequestUrl ||
    null;

  if ('connectionRequest' in device && !connectionRequestUrl) {
    score -= addIssue(issues, {
      key: 'missing_connection_request',
      label: 'Connection Request ausente',
      severity: 'warning',
      points: 15,
      description:
        'O dispositivo não expôs URL de Connection Request para comandos imediatos.',
    });
  }

  if (
    'connectionRequest' in device &&
    connectionRequestUrl &&
    device.connectionRequest?.hasPassword === false
  ) {
    score -= addIssue(issues, {
      key: 'missing_connection_request_password',
      label: 'Senha CR ausente',
      severity: 'warning',
      points: 5,
      description:
        'O CPE tem Connection Request URL, mas não possui senha CR cadastrada.',
    });
  }

  if (Array.isArray(device.wifi)) {
    const validWifi = device.wifi.filter(
      (network: any) => network?.ssid && network.ssid !== '-',
    );

    if (validWifi.length === 0) {
      score -= addIssue(issues, {
        key: 'wifi_not_detected',
        label: 'Wi-Fi não detectado',
        severity: 'warning',
        points: 10,
        description: 'Nenhum SSID válido foi identificado no CPE.',
      });
    }
  }

  if (
    typeof device.uptimeSeconds === 'number' &&
    device.uptimeSeconds > 0 &&
    device.uptimeSeconds < 600 &&
    status === 'online'
  ) {
    score -= addIssue(issues, {
      key: 'low_uptime',
      label: 'Uptime muito baixo',
      severity: 'warning',
      points: 10,
      description:
        'O equipamento reiniciou recentemente. Pode indicar instabilidade ou reboot manual.',
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: DeviceHealthLevel = 'healthy';
  let label = 'Saudável';

  if (score < 50) {
    level = 'critical';
    label = 'Crítico';
  } else if (score < 80) {
    level = 'attention';
    label = 'Atenção';
  }

  return {
    score,
    level,
    label,
    issues,
    calculatedAt: new Date().toISOString(),
  };
}

export function healthLevelClasses(level: DeviceHealthLevel): string {
  if (level === 'healthy') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (level === 'attention') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}
