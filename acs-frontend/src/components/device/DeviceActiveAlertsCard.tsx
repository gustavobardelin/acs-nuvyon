'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceAlert } from '@/types/device-alerts';
import { RemediationPlaybookCard } from '@/components/alerts/RemediationPlaybookCard';

function severityLabel(severity: string) {
  if (severity === 'critical') return 'Crítico';
  if (severity === 'warning') return 'Atenção';
  return 'Info';
}

function severityStyle(severity: string) {
  if (severity === 'critical') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (severity === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
}

function statusLabel(status: string) {
  if (status === 'OPEN') return 'Aberto';
  if (status === 'ACKNOWLEDGED') return 'Reconhecido';
  if (status === 'SILENCED') return 'Silenciado';
  if (status === 'RESOLVED') return 'Resolvido';
  return status;
}

function statusStyle(status: string) {
  if (status === 'OPEN') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'ACKNOWLEDGED') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (status === 'SILENCED') return 'border-slate-700 bg-slate-900 text-slate-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
}

function severityIcon(severity: string) {
  if (severity === 'critical') return <XCircle size={15} />;
  if (severity === 'warning') return <AlertTriangle size={15} />;
  return <CheckCircle size={15} />;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

export function DeviceActiveAlertsCard({ deviceId }: { deviceId: string }) {
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((alert) => alert.deviceId === deviceId)
      .filter((alert) => alert.status !== 'RESOLVED');
  }, [alerts, deviceId]);

  const openCount = visibleAlerts.filter((alert) => alert.status === 'OPEN').length;
  const acknowledgedCount = visibleAlerts.filter(
    (alert) => alert.status === 'ACKNOWLEDGED',
  ).length;
  const silencedCount = visibleAlerts.filter(
    (alert) => alert.status === 'SILENCED',
  ).length;

  async function loadAlerts() {
    setLoading(true);

    try {
      const response = await api.get<DeviceAlert[]>('/device-alerts', {
        params: {
          q: deviceId,
          includeResolved: false,
        },
      });

      setAlerts(response.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [deviceId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-red-300">
            <Bell size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Alertas do CPE
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Ocorrências operacionais deste dispositivo
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Alertas ativos, reconhecidos ou silenciados relacionados a este CPE.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Atualizar alertas
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-xs text-red-200/70">Abertos</p>
          <p className="mt-1 text-2xl font-bold text-red-200">{openCount}</p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
          <p className="text-xs text-sky-200/70">Reconhecidos</p>
          <p className="mt-1 text-2xl font-bold text-sky-200">
            {acknowledgedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Silenciados</p>
          <p className="mt-1 text-2xl font-bold text-slate-200">
            {silencedCount}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando alertas do CPE...
        </div>
      ) : visibleAlerts.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Nenhum alerta ativo para este CPE.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${severityStyle(
                        alert.severity,
                      )}`}
                    >
                      {severityIcon(alert.severity)}
                      {severityLabel(alert.severity)}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                        alert.status,
                      )}`}
                    >
                      {statusLabel(alert.status)}
                    </span>
                  </div>

                  <h3 className="font-bold text-white">{alert.title}</h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {alert.description}
                  </p>

                  {alert.note && (
                    <p className="mt-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                      Nota: {alert.note}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-xs text-slate-500 lg:text-right">
                  <p>Primeiro visto: {formatDate(alert.firstSeenAt)}</p>
                  <p>Último visto: {formatDate(alert.lastSeenAt)}</p>
                  <p>Ocorrências: {alert.occurrenceCount}</p>
                </div>
              </div>

              <RemediationPlaybookCard alert={alert} onUpdated={loadAlerts} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
