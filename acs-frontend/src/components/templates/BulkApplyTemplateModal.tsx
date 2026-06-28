// acs-frontend/src/components/templates/BulkApplyTemplateModal.tsx

'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProvisioningTemplate } from '@/types/provisioning-templates';

interface BulkPreviewDevice {
  id: string;
  manufacturer: string;
  model: string;
  productClass: string;
  serialNumber: string;
  ip: string;
  lanIp: string;
  status: 'online' | 'warning' | 'offline';
  lastContact: string | null;
}

interface BulkPreviewResponse {
  dryRun: boolean;
  templateId: string;
  templateName: string;
  matchedCount: number;
  limit: number;
  devices: BulkPreviewDevice[];
}

interface BulkApplyResponse {
  dryRun: boolean;
  templateId: string;
  templateName: string;
  matchedCount: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    deviceId: string;
    status: 'SUCCESS' | 'FAILED';
    actionId?: string;
    errorMessage?: string;
  }>;
}

function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'warning') return 'Atenção';
  return 'Offline';
}

function statusStyle(status: string) {
  if (status === 'online') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export function BulkApplyTemplateModal({
  open,
  template,
  onClose,
  onApplied,
}: {
  open: boolean;
  template: ProvisioningTemplate | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [model, setModel] = useState('');
  const [productClass, setProductClass] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(20);
  const [preview, setPreview] = useState<BulkPreviewResponse | null>(null);
  const [applyResult, setApplyResult] = useState<BulkApplyResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open && template) {
      setModel(template.model || '');
      setProductClass(template.productClass || '');
      setStatus('online');
      setLimit(20);
      setPreview(null);
      setApplyResult(null);
    }
  }, [open, template?.id]);

  if (!open || !template) return null;

  function buildPayload(dryRun: boolean) {
    return {
      model: model.trim() || undefined,
      productClass: productClass.trim() || undefined,
      status: status || undefined,
      limit,
      dryRun,
    };
  }

  async function loadPreview() {
    setLoadingPreview(true);
    setApplyResult(null);

    try {
      const response = await api.post<BulkPreviewResponse>(
        `/provisioning-templates/${template.id}/apply-bulk`,
        buildPayload(true),
      );

      setPreview(response.data);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar prévia.',
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function applyBulk() {
    if (!preview || preview.devices.length === 0) {
      alert('Faça a prévia antes e confirme se existem dispositivos.');
      return;
    }

    const confirmed = window.confirm(
      `Aplicar "${template.name}" em ${preview.devices.length} dispositivo(s)?`,
    );

    if (!confirmed) return;

    setApplying(true);

    try {
      const response = await api.post<BulkApplyResponse>(
        `/provisioning-templates/${template.id}/apply-bulk`,
        buildPayload(false),
      );

      setApplyResult(response.data);
      onApplied();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao aplicar em lote.',
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Aplicação em lote
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {template.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Faça a prévia antes de enviar o template para múltiplos CPEs.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="shrink-0 text-amber-300" size={20} />
            <div>
              <p className="font-semibold text-amber-200">
                Segurança operacional
              </p>
              <p className="mt-1 text-sm text-amber-100/80">
                Comece sempre com poucos dispositivos. O limite máximo desta tela é 100 por execução.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Modelo
            </label>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Archer C21"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Product Class
            </label>
            <input
              value={productClass}
              onChange={(event) => setProductClass(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Archer C21"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Status
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
            >
              <option value="">Todos</option>
              <option value="online">Online</option>
              <option value="warning">Atenção</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Limite
            </label>
            <input
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              type="number"
              min={1}
              max={100}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadPreview}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {loadingPreview ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Search size={17} />
            )}
            Prévia dos dispositivos
          </button>

          <button
            type="button"
            onClick={applyBulk}
            disabled={applying || !preview || preview.devices.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Play size={17} />
            )}
            Aplicar em lote
          </button>
        </div>

        {preview && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">
                Prévia: {preview.matchedCount} dispositivo(s)
              </h3>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                Limite {preview.limit}
              </span>
            </div>

            {preview.devices.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum dispositivo encontrado com os filtros informados.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {preview.devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-mono text-sm text-white">
                          {device.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {device.manufacturer} · {device.model} · SN {device.serialNumber}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyle(
                            device.status,
                          )}`}
                        >
                          {statusLabel(device.status)}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-400">
                          WAN {device.ip}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {applyResult && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle size={18} />
              <p className="font-semibold">
                Aplicação finalizada: {applyResult.successCount} sucesso(s),{' '}
                {applyResult.failedCount} falha(s)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
