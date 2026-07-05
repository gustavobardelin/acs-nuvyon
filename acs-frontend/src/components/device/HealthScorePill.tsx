'use client';

import { Activity } from 'lucide-react';
import { calculateDeviceHealth, healthLevelClasses } from '@/lib/device-health';
import { DeviceDetails, DeviceSummary } from '@/types/devices';

export function HealthScorePill({
  device,
}: {
  device: Partial<DeviceSummary & DeviceDetails>;
}) {
  const health = calculateDeviceHealth(device);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${healthLevelClasses(
        health.level,
      )}`}
      title={health.issues.map((issue) => issue.label).join(', ') || 'Saudável'}
    >
      <Activity size={12} />
      Health {health.score}
    </span>
  );
}
