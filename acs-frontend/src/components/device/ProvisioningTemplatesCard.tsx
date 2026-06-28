// acs-frontend/src/components/device/ProvisioningTemplatesCard.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, FileSliders, Loader2, Play, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceDetails } from '@/types/devices';
import { ProvisioningTemplate } from '@/types/provisioning-templates';

export function ProvisioningTemplatesCard({
  device,
  onNotify,
}: {
  device: DeviceDetails;
  onNotify?: (message: string) => void;
}) {
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  async function loadTemplates() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ProvisioningTemplate[]>(
        '/provisioning-templates',
        {
          params: {
            model: device.model,
            productClass: device.productClass,
          },
        },
      );

      setTemplates(response.data);

      if (!selectedTemplateId && response.data.length > 0) {
        setSelectedTemplateId(response.data[0].id);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao buscar templates.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyTemplate() {
    if (!selectedTemplateId) {
      alert('Selecione um template.');
      return;
    }

    const confirmed = window.confirm(
      `Aplicar o template "${selectedTemplate?.name}" neste dispositivo?`,
    );

    if (!confirmed) return;

    setApplying(true);

    try {
      await api.post(
        `/provisioning-templates/${selectedTemplateId}/apply/${encodeURIComponent(
          device.id,
        )}`,
      );

      onNotify?.('Template aplicado via Connection Request.');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao aplicar template.',
      );
    } finally {
      setApplying(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, [device.id]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <FileSliders size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Provisioning Templates
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Aplicar template no dispositivo
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Envia um conjunto de parâmetros TR-069 via GenieACS.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTemplates}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/70 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl bg-slate-900/70 p-4 text-sm text-slate-500">
          Nenhum template compatível encontrado.
        </div>
      ) : (
        <div className="space-y-5">
          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          {selectedTemplate && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedTemplate.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedTemplate.description || 'Sem descrição.'}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle size={12} />
                  {selectedTemplate.parameters.length} parâmetro(s)
                </span>
              </div>

              <div className="space-y-2">
                {selectedTemplate.parameters.slice(0, 8).map((parameter, index) => (
                  <div
                    key={`${parameter.path}-${index}`}
                    className="rounded-lg bg-slate-950/70 p-3"
                  >
                    <p className="break-all font-mono text-xs text-slate-400">
                      {parameter.path}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {String(parameter.value)} · {parameter.type}
                    </p>
                  </div>
                ))}

                {selectedTemplate.parameters.length > 8 && (
                  <p className="text-xs text-slate-600">
                    + {selectedTemplate.parameters.length - 8} parâmetro(s)
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={applyTemplate}
            disabled={applying || !selectedTemplateId}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
            Aplicar template
          </button>
        </div>
      )}
    </div>
  );
}
