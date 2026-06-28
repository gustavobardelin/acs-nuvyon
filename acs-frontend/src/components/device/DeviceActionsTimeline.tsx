// acs-frontend/src/components/device/DeviceActionsTimeline.tsx

'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wifi,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceAction, DeviceActionStatus, DeviceActionType } from '@/types/devices';

function formatDate(value: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs === undefined) return '-';

  if (durationMs < 1000) return `${durationMs} ms`;

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getStatusStyle(status: DeviceActionStatus): string {
  if (status === 'SUCCESS') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'FAILED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function getStatusLabel(status: DeviceActionStatus): string {
  if (status === 'SUCCESS') return 'Sucesso';
  if (status === 'FAILED') return 'Falhou';
  return 'Pendente';
}

function getActionIcon(type: DeviceActionType) {
  if (type === 'REBOOT') return RotateCcw;
  if (type === 'UPDATE_WIFI') return Wifi;
  if (type === 'TEST_CONNECTION_REQUEST') return ShieldCheck;
  return RefreshCw;
}

function getStatusIcon(status: DeviceActionStatus) {
  if (status === 'SUCCESS') return CheckCircle;
  if (status === 'FAILED') return XCircle;
  return Clock;
}

export function DeviceActionsTimeline({
  deviceId,
}: {
  deviceId: string;
}) {
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadActions() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<DeviceAction[]>('/device-actions', {
        params: {
          deviceId,
          limit: 30,
        },
      });

      setActions(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao buscar histórico de ações.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActions();
  }, [deviceId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <Clock size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Histórico de ações
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Comandos executados no dispositivo
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Auditoria de reboot, refresh, Wi-Fi e testes de Connection Request.
          </p>
        </div>

        <button
          type="button"
          onClick={loadActions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          Atualizar
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/70 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando histórico...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && actions.length === 0 && (
        <div className="rounded-xl bg-slate-900/70 p-4 text-sm text-slate-500">
          Nenhuma ação registrada para este dispositivo ainda.
        </div>
      )}

      {!loading && !error && actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((action) => {
            const ActionIcon = getActionIcon(action.actionType);
            const StatusIcon = getStatusIcon(action.status);

            return (
              <div
                key={action.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                      <ActionIcon size={18} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {action.actionLabel}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusStyle(
                            action.status,
                          )}`}
                        >
                          <StatusIcon size={12} />
                          {getStatusLabel(action.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {action.requestedByEmail || 'Usuário desconhecido'} ·{' '}
                        {formatDate(action.startedAt)}
                      </p>

                      {action.objectName && (
                        <p className="mt-2 break-all font-mono text-xs text-slate-500">
                          {action.objectName}
                        </p>
                      )}

                      {action.errorMessage && (
                        <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                          {action.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm md:min-w-56">
                    <div className="rounded-lg bg-slate-950/70 p-3">
                      <p className="text-xs text-slate-500">Método</p>
                      <p className="mt-1 font-semibold text-slate-200">
                        {action.method}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/70 p-3">
                      <p className="text-xs text-slate-500">Duração</p>
                      <p className="mt-1 font-semibold text-slate-200">
                        {formatDuration(action.durationMs)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
