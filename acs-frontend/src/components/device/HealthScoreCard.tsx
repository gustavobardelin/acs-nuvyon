'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { calculateDeviceHealth, healthLevelClasses } from '@/lib/device-health';
import { DeviceDetails, DeviceSummary } from '@/types/devices';

function issueIcon(severity: string) {
  if (severity === 'critical') return <XCircle size={16} />;
  if (severity === 'warning') return <AlertTriangle size={16} />;
  return <Info size={16} />;
}

function issueStyle(severity: string) {
  if (severity === 'critical') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (severity === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
}

export function HealthScoreCard({
  device,
}: {
  device: Partial<DeviceSummary & DeviceDetails>;
}) {
  const health = calculateDeviceHealth(device);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <Activity size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Health Score
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Saúde operacional do CPE
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Nota calculada com base em inform, IP, CR, identificação e parâmetros detectados.
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${healthLevelClasses(
            health.level,
          )}`}
        >
          <ShieldAlert size={16} />
          {health.label}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          <p className="text-sm text-slate-500">Nota</p>
          <p className="mt-2 text-5xl font-black text-white">
            {health.score}
          </p>
          <p className="mt-1 text-sm text-slate-500">de 100</p>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${health.score}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            {health.issues.length === 0 ? (
              <CheckCircle className="text-emerald-300" size={18} />
            ) : (
              <AlertTriangle className="text-amber-300" size={18} />
            )}

            <h3 className="font-semibold text-white">
              {health.issues.length === 0
                ? 'Nenhum problema relevante detectado'
                : `${health.issues.length} ponto(s) de atenção`}
            </h3>
          </div>

          {health.issues.length === 0 ? (
            <p className="text-sm text-slate-500">
              Este CPE está com indicadores operacionais saudáveis.
            </p>
          ) : (
            <div className="space-y-3">
              {health.issues.map((issue) => (
                <div
                  key={issue.key}
                  className={`rounded-xl border p-3 ${issueStyle(
                    issue.severity,
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{issueIcon(issue.severity)}</div>

                    <div>
                      <p className="font-semibold">
                        -{issue.points} · {issue.label}
                      </p>
                      <p className="mt-1 text-sm opacity-80">
                        {issue.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
