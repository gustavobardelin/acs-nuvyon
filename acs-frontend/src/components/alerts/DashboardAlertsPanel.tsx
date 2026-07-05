'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Loader2,
  RefreshCw,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceAlert, DeviceAlertSummary } from '@/types/device-alerts';

function severityStyle(severity: string) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
}

function severityLabel(severity: string) {
  if (severity === 'critical') return 'Crítico';
  if (severity === 'warning') return 'Atenção';
  return 'Info';
}

export function DashboardAlertsPanel() {
  const [summary, setSummary] = useState<DeviceAlertSummary | null>(null);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const [summaryResponse, alertsResponse] = await Promise.all([
        api.get<DeviceAlertSummary>('/device-alerts/summary'),
        api.get<DeviceAlert[]>('/device-alerts'),
      ]);

      setSummary(summaryResponse.data);
      setAlerts(alertsResponse.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-red-300">
            <Bell size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              NOC Alert Center
            </p>
          </div>

          <h2 className="text-xl font-bold text-white">
            Fila operacional de alertas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Visão rápida dos alertas ativos, reconhecidos e silenciados.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Atualizar
          </button>

          <a
            href="/alerts"
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
          >
            <Bell size={16} />
            Abrir alertas
          </a>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <XCircle className="text-red-300" size={20} />
          <p className="mt-3 text-xs text-red-200/70">Abertos</p>
          <p className="mt-1 text-2xl font-bold text-red-200">
            {summary?.open || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="text-amber-300" size={20} />
          <p className="mt-3 text-xs text-amber-200/70">Críticos/Atenção</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">
            {(summary?.critical || 0) + (summary?.warning || 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
          <Bell className="text-sky-300" size={20} />
          <p className="mt-3 text-xs text-sky-200/70">Reconhecidos</p>
          <p className="mt-1 text-2xl font-bold text-sky-200">
            {summary?.acknowledged || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <ShieldOff className="text-slate-400" size={20} />
          <p className="mt-3 text-xs text-slate-500">Silenciados</p>
          <p className="mt-1 text-2xl font-bold text-slate-200">
            {summary?.silenced || 0}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando alertas...
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Nenhum alerta operacional ativo.
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert) => (
            <a
              key={alert.id}
              href={`/devices/${encodeURIComponent(alert.deviceId)}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityStyle(
                        alert.severity,
                      )}`}
                    >
                      {severityLabel(alert.severity)}
                    </span>

                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                      {alert.status}
                    </span>
                  </div>

                  <p className="font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {alert.device.manufacturer} · {alert.device.model} · {alert.device.ip}
                  </p>
                </div>

                <p className="break-all font-mono text-xs text-slate-600 lg:max-w-md">
                  {alert.deviceId}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
