'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Eye,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getRemediationPlaybook } from '@/lib/remediation-playbooks';
import { DeviceAlert } from '@/types/device-alerts';

function riskStyle(risk: string) {
  if (risk === 'high') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (risk === 'medium') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
}

function riskLabel(risk: string) {
  if (risk === 'high') return 'Risco alto';
  if (risk === 'medium') return 'Risco médio';
  return 'Risco baixo';
}

export function RemediationPlaybookCard({
  alert,
  onUpdated,
}: {
  alert: DeviceAlert;
  onUpdated?: () => Promise<void> | void;
}) {
  const playbook = getRemediationPlaybook(alert);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string>('');

  async function runAction(
    actionKey: string,
    action: () => Promise<any>,
    successMessage: string,
  ) {
    setLoadingAction(actionKey);
    setLastResult('');

    try {
      await action();
      setLastResult(successMessage);
      await onUpdated?.();
    } catch (err: any) {
      alertMessage(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao executar ação.',
      );
    } finally {
      setLoadingAction(null);
    }
  }

  function alertMessage(message: string) {
    window.alert(message);
  }

  async function testConnectionRequest() {
    await runAction(
      'test-cr',
      () =>
        api.post(
          `/devices/${encodeURIComponent(alert.deviceId)}/connection-request/test`,
        ),
      'Teste de Connection Request executado.',
    );
  }

  async function refreshDevice() {
    await runAction(
      'refresh-device',
      () =>
        api.post(`/devices/${encodeURIComponent(alert.deviceId)}/refresh`, {
          objectName: 'Device',
        }),
      'Refresh geral enviado via ACS.',
    );
  }

  async function refreshWan() {
    await runAction(
      'refresh-wan',
      () =>
        api.post(`/devices/${encodeURIComponent(alert.deviceId)}/refresh`, {
          objectName: 'Device.IP',
        }),
      'Refresh WAN/IP enviado via ACS.',
    );
  }

  async function silenceAsExpected() {
    const reason = window.prompt(
      'Motivo do silenciamento:',
      'Cenário esperado: equipamento em laboratório/AP/DHCP atrás de outro roteador.',
    );

    if (reason === null) return;

    await runAction(
      'silence-expected',
      () =>
        api.patch(`/device-alerts/${encodeURIComponent(alert.id)}/silence`, {
          reason,
        }),
      'Alerta silenciado como cenário esperado.',
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <ClipboardList size={17} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Remediation Playbook
            </p>
          </div>

          <h3 className="font-semibold text-white">{playbook.title}</h3>

          <p className="mt-1 text-sm text-slate-400">{playbook.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${riskStyle(
              playbook.riskLevel,
            )}`}
          >
            <ShieldAlert size={12} />
            {riskLabel(playbook.riskLevel)}
          </span>

          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
              playbook.canAutoFix
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-950 text-slate-400'
            }`}
          >
            {playbook.canAutoFix ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {playbook.canAutoFix ? 'Auto-fix permitido' : 'Sem auto-fix'}
          </span>
        </div>
      </div>

      <div className="mb-4 grid gap-3">
        {playbook.steps.map((step, index) => (
          <div
            key={`${step.title}-${index}`}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-300">
                {index + 1}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{step.title}</p>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskStyle(
                      step.risk,
                    )}`}
                  >
                    {riskLabel(step.risk)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
        <div className="mb-3 flex items-center gap-2 text-sky-300">
          <Radar size={16} />
          <p className="font-semibold">Ações seguras</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/devices/${encodeURIComponent(alert.deviceId)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <Eye size={15} />
            Abrir CPE
          </a>

          <button
            type="button"
            onClick={testConnectionRequest}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {loadingAction === 'test-cr' ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Radar size={15} />
            )}
            Testar CR
          </button>

          <button
            type="button"
            onClick={refreshDevice}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {loadingAction === 'refresh-device' ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh Device
          </button>

          <button
            type="button"
            onClick={refreshWan}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {loadingAction === 'refresh-wan' ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh WAN
          </button>

          {alert.status !== 'SILENCED' && (
            <button
              type="button"
              onClick={silenceAsExpected}
              disabled={loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 disabled:opacity-50"
            >
              {loadingAction === 'silence-expected' ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <ShieldOff size={15} />
              )}
              Silenciar cenário esperado
            </button>
          )}
        </div>

        {lastResult && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {lastResult}
          </div>
        )}
      </div>

      {playbook.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <p className="font-semibold">Cuidados antes de agir</p>
          </div>

          <ul className="space-y-1 text-sm text-amber-100/80">
            {playbook.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
