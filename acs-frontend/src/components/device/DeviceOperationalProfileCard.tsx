'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Edit3,
  Loader2,
  MapPin,
  Save,
  Tag,
  User,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceMetadata,
  DeviceOperationalMode,
} from '@/types/device-metadata';

const emptyProfile = (deviceId: string): DeviceMetadata => ({
  id: null,
  deviceId,
  label: null,
  customerName: null,
  customerCode: null,
  city: null,
  address: null,
  operationalMode: 'unknown',
  tags: [],
  notes: null,
  updatedByEmail: null,
  createdAt: null,
  updatedAt: null,
});

function modeLabel(mode: DeviceOperationalMode) {
  const labels: Record<DeviceOperationalMode, string> = {
    unknown: 'Não definido',
    production: 'Produção',
    lab: 'Laboratório',
    ap: 'Modo AP',
    bridge: 'Bridge',
    maintenance: 'Manutenção',
  };

  return labels[mode] || mode;
}

function modeStyle(mode: DeviceOperationalMode) {
  if (mode === 'production') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (mode === 'lab') {
    return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
  }

  if (mode === 'ap' || mode === 'bridge') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }

  if (mode === 'maintenance') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function formatDate(value: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

export function DeviceOperationalProfileCard({
  deviceId,
}: {
  deviceId: string;
}) {
  const [profile, setProfile] = useState<DeviceMetadata>(emptyProfile(deviceId));
  const [form, setForm] = useState<DeviceMetadata>(emptyProfile(deviceId));
  const [tagsText, setTagsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function loadProfile() {
    setLoading(true);

    try {
      const response = await api.get<DeviceMetadata>(
        `/device-metadata/${encodeURIComponent(deviceId)}`,
      );

      const data = response.data || emptyProfile(deviceId);

      setProfile(data);
      setForm(data);
      setTagsText((data.tags || []).join(', '));
    } catch (err) {
      console.error(err);
      const fallback = emptyProfile(deviceId);

      setProfile(fallback);
      setForm(fallback);
      setTagsText('');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);

    try {
      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await api.patch<DeviceMetadata>(
        `/device-metadata/${encodeURIComponent(deviceId)}`,
        {
          label: form.label || '',
          customerName: form.customerName || '',
          customerCode: form.customerCode || '',
          city: form.city || '',
          address: form.address || '',
          operationalMode: form.operationalMode || 'unknown',
          tags,
          notes: form.notes || '',
        },
      );

      setProfile(response.data);
      setForm(response.data);
      setTagsText((response.data.tags || []).join(', '));
      setEditing(false);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao salvar perfil operacional.',
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setForm(profile);
    setTagsText((profile.tags || []).join(', '));
    setEditing(false);
  }

  useEffect(() => {
    loadProfile();
  }, [deviceId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-purple-300">
            <Building2 size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Perfil operacional
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Contexto interno do CPE
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Dados locais do ACS para identificar cenário, cliente, tags e observações técnicas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${modeStyle(
              profile.operationalMode,
            )}`}
          >
            {modeLabel(profile.operationalMode)}
          </span>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <Edit3 size={15} />
              Editar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                Salvar
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                <X size={15} />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando perfil operacional...
        </div>
      ) : editing ? (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Nome interno
              </span>
              <input
                value={form.label || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                placeholder="Ex: Archer C21 bancada"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Modo operacional
              </span>
              <select
                value={form.operationalMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    operationalMode: event.target.value as DeviceOperationalMode,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              >
                <option value="unknown">Não definido</option>
                <option value="production">Produção</option>
                <option value="lab">Laboratório</option>
                <option value="ap">Modo AP</option>
                <option value="bridge">Bridge</option>
                <option value="maintenance">Manutenção</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Cliente
              </span>
              <input
                value={form.customerName || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                placeholder="Nome do cliente ou laboratório"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Código do cliente
              </span>
              <input
                value={form.customerCode || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customerCode: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                placeholder="Ex: ID Hubsoft"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Cidade
              </span>
              <input
                value={form.city || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                placeholder="Cidade"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Endereço
              </span>
              <input
                value={form.address || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                placeholder="Endereço ou referência"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">
              Tags
            </span>
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="teste, tplink, archer, laboratório"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">
              Observações técnicas
            </span>
            <textarea
              value={form.notes || ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Ex: Equipamento atrás do roteador principal; ausência de IP WAN é esperada."
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Building2 size={15} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Nome interno
                </p>
              </div>
              <p className="text-white">{profile.label || '-'}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <User size={15} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Cliente
                </p>
              </div>
              <p className="text-white">{profile.customerName || '-'}</p>
              {profile.customerCode && (
                <p className="mt-1 text-xs text-slate-500">
                  Código: {profile.customerCode}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <MapPin size={15} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Localização
                </p>
              </div>
              <p className="text-white">{profile.city || '-'}</p>
              {profile.address && (
                <p className="mt-1 text-xs text-slate-500">
                  {profile.address}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Tag size={15} />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Tags
              </p>
            </div>

            {profile.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma tag cadastrada.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Observações
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {profile.notes || 'Nenhuma observação cadastrada.'}
            </p>
          </div>

          <p className="text-xs text-slate-600">
            Última atualização: {formatDate(profile.updatedAt)} · Por:{' '}
            {profile.updatedByEmail || '-'}
          </p>
        </div>
      )}
    </div>
  );
}
