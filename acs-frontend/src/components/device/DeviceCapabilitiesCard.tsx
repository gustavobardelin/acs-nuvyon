// acs-frontend/src/components/device/DeviceCapabilitiesCard.tsx

'use client';

import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { DeviceCapability, DeviceCapabilityStatus } from '@/types/devices';

function getStatusLabel(status: DeviceCapabilityStatus): string {
  if (status === 'supported') return 'Suportado';
  if (status === 'unsupported') return 'Não suportado';
  if (status === 'partial') return 'Parcial';
  return 'Não testado';
}

function getStatusStyle(status: DeviceCapabilityStatus): string {
  if (status === 'supported') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'unsupported') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (status === 'partial') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function getStatusIcon(status: DeviceCapabilityStatus) {
  if (status === 'supported') return CheckCircle;
  if (status === 'unsupported') return XCircle;
  if (status === 'partial') return AlertTriangle;
  return HelpCircle;
}

export function DeviceCapabilitiesCard({
  capabilities,
}: {
  capabilities: DeviceCapability[] | null | undefined;
}) {
  const items = capabilities || [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-sky-400">
          <ShieldCheck size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Capacidades do dispositivo
          </p>
        </div>

        <h2 className="text-lg font-bold text-white">
          O que este modelo permite via TR-069
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Detecção baseada nos parâmetros sincronizados pelo GenieACS.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-slate-900/70 p-4 text-sm text-slate-500">
          Nenhuma capacidade detectada ainda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = getStatusIcon(item.status);

            return (
              <div
                key={item.key}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-white">{item.label}</h3>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusStyle(
                      item.status,
                    )}`}
                  >
                    <Icon size={12} />
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <p className="text-sm text-slate-400">{item.description}</p>

                {item.source && (
                  <p className="mt-2 text-xs text-slate-600">
                    Fonte: {item.source}
                  </p>
                )}

                {item.paths && item.paths.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-300">
                      Ver parâmetros
                    </summary>

                    <div className="mt-2 space-y-1">
                      {item.paths.slice(0, 8).map((path, index) => (
                        <p
                          key={`${item.key}-${index}-${path}`}
                          className="break-all rounded-lg bg-slate-950/70 px-2 py-1 font-mono text-xs text-slate-500"
                        >
                          {path}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
