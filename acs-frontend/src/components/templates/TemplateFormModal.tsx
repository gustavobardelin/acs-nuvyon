// acs-frontend/src/components/templates/TemplateFormModal.tsx

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  ProvisioningTemplate,
  ProvisioningTemplateParameter,
} from '@/types/provisioning-templates';
import { TemplateParametersEditor } from './TemplateParametersEditor';

interface TemplateFormState {
  name: string;
  description: string;
  vendor: string;
  model: string;
  productClass: string;
  tags: string;
  status: 'active' | 'inactive';
  parameters: ProvisioningTemplateParameter[];
}

function createInitialState(template?: ProvisioningTemplate | null): TemplateFormState {
  return {
    name: template?.name || '',
    description: template?.description || '',
    vendor: template?.vendor || '',
    model: template?.model || '',
    productClass: template?.productClass || '',
    tags: template?.tags?.join(', ') || '',
    status: template?.status || 'active',
    parameters:
      template?.parameters && template.parameters.length > 0
        ? template.parameters
        : [
            {
              path: 'Device.ManagementServer.PeriodicInformInterval',
              value: 300,
              type: 'xsd:unsignedInt',
            },
          ],
  };
}

export function TemplateFormModal({
  open,
  template,
  onClose,
  onSaved,
}: {
  open: boolean;
  template?: ProvisioningTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TemplateFormState>(
    createInitialState(template),
  );
  const [saving, setSaving] = useState(false);

  const editing = Boolean(template?.id);

  useEffect(() => {
    if (open) {
      setForm(createInitialState(template));
    }
  }, [open, template?.id]);

  if (!open) return null;

  function updateField<K extends keyof TemplateFormState>(
    field: K,
    value: TemplateFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      vendor: form.vendor.trim() || undefined,
      model: form.model.trim() || undefined,
      productClass: form.productClass.trim() || undefined,
      status: form.status,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      parameters: form.parameters
        .map((parameter) => ({
          path: parameter.path.trim(),
          value: parameter.value,
          type: parameter.type,
        }))
        .filter((parameter) => parameter.path),
    };
  }

  async function handleSave() {
    const payload = buildPayload();

    if (!payload.name || payload.name.length < 3) {
      alert('Informe um nome com pelo menos 3 caracteres.');
      return;
    }

    if (payload.parameters.length === 0) {
      alert('Adicione pelo menos um parâmetro.');
      return;
    }

    setSaving(true);

    try {
      if (editing && template) {
        await api.patch(`/provisioning-templates/${template.id}`, payload);
      } else {
        await api.post('/provisioning-templates', payload);
      }

      onSaved();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao salvar template.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Provisioning Template
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {editing ? 'Editar template' : 'Criar template'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure parâmetros TR-069 para aplicar em dispositivos.
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Nome
            </label>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Archer C21 - Guest Nuvyon ON"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Status
            </label>
            <select
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as 'active' | 'inactive')
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Explique o objetivo do template."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Vendor
            </label>
            <input
              value={form.vendor}
              onChange={(event) => updateField('vendor', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="TP-Link"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Modelo
            </label>
            <input
              value={form.model}
              onChange={(event) => updateField('model', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Archer C21"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Product Class
            </label>
            <input
              value={form.productClass}
              onChange={(event) =>
                updateField('productClass', event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Archer C21"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Tags
            </label>
            <input
              value={form.tags}
              onChange={(event) => updateField('tags', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="tplink, guest, wifi"
            />
          </div>
        </div>

        <div className="mt-6">
          <TemplateParametersEditor
            parameters={form.parameters}
            onChange={(parameters) => updateField('parameters', parameters)}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Salvar template
          </button>
        </div>
      </div>
    </div>
  );
}
