// acs-frontend/src/components/device/ConnectionRequestCard.tsx

'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Clipboard,
  Loader2,
  Network,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceConnectionRequestInfo,
  DeviceConnectionRequestTestResult,
} from '@/types/devices';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

export function ConnectionRequestCard({
  deviceId,
  info,
  onNotify,
}: {
  deviceId: string;
  info: DeviceConnectionRequestInfo | null | undefined;
  onNotify: (message: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] =
    useState<DeviceConnectionRequestTestResult | null>(null);

  const hasUrl = Boolean(info?.url);

  const managementObject =
    info?.source === 'InternetGatewayDevice'
      ? 'InternetGatewayDevice.ManagementServer'
      : 'Device.ManagementServer';

  async function handleTest() {
    setTesting(true);
    setResult(null);

    try {
      const response = await api.post<DeviceConnectionRequestTestResult>(
        `/devices/${encodeURIComponent(deviceId)}/connection-request/test`,
      );

      setResult(response.data);

      if (response.data.reachable) {
        onNotify('Connection Request alcançável pela VPS.');
      } else {
        onNotify('Connection Request não respondeu no teste.');
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao testar Connection Request.',
      );
    } finally {
      setTesting(false);
    }
  }

  async function handleRefreshManagementServer() {
    setRefreshing(true);

    try {
      await api.post(`/devices/${encodeURIComponent(deviceId)}/refresh`, {
        objectName: managementObject,
      });

      onNotify(
        `Refresh de ${managementObject} enviado via Connection Request.`,
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao enviar refresh via Connection Request.',
      );
    } finally {
      setTimeout(() => setRefreshing(false), 2500);
    }
  }

  async function handleCopyUrl() {
    if (!info?.url) return;

    await copyText(info.url);
    onNotify('URL do Connection Request copiada.');
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <ShieldCheck size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Connection Request
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Execução instantânea TR-069
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Testa se a VPS consegue chamar o CPE sem esperar o próximo Inform.
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            hasUrl
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {hasUrl ? 'Configurado' : 'Sem URL'}
        </span>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            URL
          </p>
          <p className="mt-2 break-all font-mono text-sm text-slate-200">
            {info?.url || 'Não sincronizada'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Usuário</p>
            <p className="mt-1 break-all text-sm font-semibold text-white">
              {info?.username || '-'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Senha</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                info?.hasPassword ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {info?.hasPassword ? 'Cadastrada' : 'Ausente'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Objeto</p>
            <p className="mt-1 break-all text-sm font-semibold text-white">
              {info?.source || '-'}
            </p>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-xl border p-4 ${
              result.reachable
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              {result.reachable ? (
                <CheckCircle className="text-emerald-400" size={18} />
              ) : (
                <XCircle className="text-red-400" size={18} />
              )}

              <p
                className={`text-sm font-bold ${
                  result.reachable ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {result.reachable ? 'Alcançável' : 'Falhou'}
              </p>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">HTTP</p>
                <p className="font-semibold text-white">
                  {result.statusCode || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Auth</p>
                <p className="font-semibold text-white">{result.authType}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Latência</p>
                <p className="font-semibold text-white">
                  {result.latencyMs} ms
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Servidor</p>
                <p className="font-semibold text-white">
                  {result.server || '-'}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-300">{result.message}</p>

            <p className="mt-2 text-xs text-slate-500">
              Testado em {formatDate(result.testedAt)}
            </p>

            {result.authHeader && (
              <p className="mt-3 break-all font-mono text-xs text-slate-600">
                {result.authHeader}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={!hasUrl || testing}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Network size={16} />
            )}
            Testar alcance
          </button>

          <button
            type="button"
            onClick={handleRefreshManagementServer}
            disabled={!hasUrl || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh via CR
          </button>

          <button
            type="button"
            onClick={handleCopyUrl}
            disabled={!hasUrl}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clipboard size={16} />
            Copiar URL
          </button>
        </div>
      </div>
    </div>
  );
}