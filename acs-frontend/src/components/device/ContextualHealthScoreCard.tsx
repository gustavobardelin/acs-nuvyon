'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DeviceDetails, DeviceSummary } from '@/types/devices';
import { DeviceMetadata } from '@/types/device-metadata';
import { HealthScoreCard } from '@/components/device/HealthScoreCard';

export function ContextualHealthScoreCard({
  device,
}: {
  device: Partial<DeviceSummary & DeviceDetails>;
}) {
  const [metadata, setMetadata] = useState<DeviceMetadata | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMetadata() {
      if (!device.id) return;

      try {
        const response = await api.get<DeviceMetadata>(
          `/device-metadata/${encodeURIComponent(device.id)}`,
        );

        if (mounted) {
          setMetadata(response.data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadMetadata();

    return () => {
      mounted = false;
    };
  }, [device.id]);

  return (
    <HealthScoreCard
      device={{
        ...device,
        operationalMode: metadata?.operationalMode || 'unknown',
      }}
    />
  );
}
