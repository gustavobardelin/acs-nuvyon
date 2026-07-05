'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ModelProfile } from '@/types/model-profiles';

type FormState = Partial<ModelProfile>;

const defaultParameterMap = {
  wifi2gSsid: '',
  wifi2gPassword: '',
  wifi5gSsid: '',
  wifi5gPassword: '',
  guest2gEnable: '',
  guest2gSsid: '',
  guest2gPassword: '',
  guest5gEnable: '',
  guest5gSsid: '',
  guest5gPassword: '',
  periodicInformEnable: '',
  periodicInformInterval: '',
  connectionRequestUrl: '',
  wanIp: '',
  pppUsername: '',
  vlanWan: '',
  firmwareVersion: '',
};

const defaultCapabilities = {
  connectionRequest: false,
  reboot: false,
  wifiRead: false,
  wifiWrite: false,
  wifiPasswordRead: false,
  wifiPasswordWrite: false,
  guestWifi: false,
  vlanBySsid: false,
  wanVlan: false,
  firmwareUpgrade: false,
  hostsRead: false,
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

function statusStyle(status: string) {
  if (status === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'draft') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function statusLabel(status: string) {
  if (status === 'active') return 'Ativo';
  if (status === 'draft') return 'Rascunho';
  if (status === 'deprecated') return 'Depreciado';
  return status;
}

function safeJsonParse(value: string, label: string) {
  try {
    const parsed = JSON.parse(value || '{}');

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`${label} precisa ser um objeto JSON.`);
    }

    return parsed;
  } catch (err: any) {
    throw new Error(`JSON inválido em ${label}: ${err.message}`);
  }
}

function emptyForm(): FormState {
  return {
    displayName: '',
    manufacturer: '',
    model: '',
    productClass: '',
    rootObject: 'unknown',
    status: 'active',
    parameterMap: defaultParameterMap,
    capabilities: defaultCapabilities,
    recommendedTemplates: [],
    tags: [],
    notes: '',
  };
}

export default function ModelProfilesPage() {
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [parameterMapText, setParameterMapText] = useState('');
  const [capabilitiesText, setCapabilitiesText] = useState('');
  const [templatesText, setTemplatesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredProfiles = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return profiles;

    return profiles.filter((profile) => {
      const haystack = [
        profile.displayName,
        profile.manufacturer,
        profile.model,
        profile.productClass,
        profile.rootObject,
        profile.status,
        profile.tags?.join(' '),
        profile.notes,
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [profiles, q]);

  async function loadProfiles() {
    setLoading(true);

    try {
      const response = await api.get<ModelProfile[]>('/model-profiles');
      setProfiles(response.data || []);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar perfis de modelo.',
      );
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    const form = emptyForm();
    setEditing(form);
    setParameterMapText(JSON.stringify(form.parameterMap, null, 2));
    setCapabilitiesText(JSON.stringify(form.capabilities, null, 2));
    setTemplatesText('');
    setTagsText('');
  }

  function startEdit(profile: ModelProfile) {
    setEditing(profile);
    setParameterMapText(JSON.stringify(profile.parameterMap || {}, null, 2));
    setCapabilitiesText(JSON.stringify(profile.capabilities || {}, null, 2));
    setTemplatesText((profile.recommendedTemplates || []).join(', '));
    setTagsText((profile.tags || []).join(', '));
  }

  function cancelEdit() {
    setEditing(null);
    setParameterMapText('');
    setCapabilitiesText('');
    setTemplatesText('');
    setTagsText('');
  }

  async function saveProfile() {
    if (!editing) return;

    setSaving(true);

    try {
      const parameterMap = safeJsonParse(parameterMapText, 'Mapa de parâmetros');
      const capabilities = safeJsonParse(capabilitiesText, 'Capabilities');

      const payload = {
        displayName: editing.displayName || '',
        manufacturer: editing.manufacturer || '',
        model: editing.model || '',
        productClass: editing.productClass || '',
        rootObject: editing.rootObject || 'unknown',
        status: editing.status || 'active',
        parameterMap,
        capabilities,
        recommendedTemplates: templatesText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        tags: tagsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        notes: editing.notes || '',
      };

      if (editing.id) {
        await api.patch(`/model-profiles/${encodeURIComponent(editing.id)}`, payload);
      } else {
        await api.post('/model-profiles', payload);
      }

      cancelEdit();
      await loadProfiles();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile(profile: ModelProfile) {
    const confirmed = window.confirm(`Excluir perfil "${profile.displayName}"?`);

    if (!confirmed) return;

    try {
      await api.delete(`/model-profiles/${encodeURIComponent(profile.id)}`);
      await loadProfiles();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao excluir perfil.',
      );
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-sky-300"
            >
              <ArrowLeft size={16} />
              Voltar ao dashboard
            </a>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
                <BookOpen size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Base de Conhecimento de Modelos
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Perfis técnicos por fabricante, modelo e product class, com paths conhecidos,
              capabilities, templates recomendados e observações operacionais.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <Plus size={17} />
              Novo perfil
            </button>

            <button
              type="button"
              onClick={loadProfiles}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>
        </div>

        {editing && (
          <section className="mb-8 rounded-3xl border border-violet-500/30 bg-slate-950/90 p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                  Editor de perfil
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {editing.id ? 'Editar perfil' : 'Novo perfil'}
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Nome de exibição
                </span>
                <input
                  value={editing.displayName || ''}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, displayName: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="Ex: TP-Link Archer C21"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Fabricante
                </span>
                <input
                  value={editing.manufacturer || ''}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, manufacturer: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="TP-Link"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Modelo
                </span>
                <input
                  value={editing.model || ''}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, model: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="Archer C21"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Product Class
                </span>
                <input
                  value={editing.productClass || ''}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, productClass: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="Archer C21"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Root Object
                </span>
                <select
                  value={editing.rootObject || 'unknown'}
                  onChange={(event) =>
                    setEditing((current) =>
                      current
                        ? { ...current, rootObject: event.target.value as any }
                        : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="unknown">unknown</option>
                  <option value="Device">Device</option>
                  <option value="InternetGatewayDevice">InternetGatewayDevice</option>
                  <option value="mixed">mixed</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Status
                </span>
                <select
                  value={editing.status || 'active'}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, status: event.target.value as any } : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="active">Ativo</option>
                  <option value="draft">Rascunho</option>
                  <option value="deprecated">Depreciado</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Mapa de parâmetros JSON
                </span>
                <textarea
                  value={parameterMapText}
                  onChange={(event) => setParameterMapText(event.target.value)}
                  rows={16}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs text-white outline-none focus:border-violet-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Capabilities JSON
                </span>
                <textarea
                  value={capabilitiesText}
                  onChange={(event) => setCapabilitiesText(event.target.value)}
                  rows={16}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Templates recomendados
                </span>
                <input
                  value={templatesText}
                  onChange={(event) => setTemplatesText(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="Archer C21 - TR-069, Archer C21 - Guest"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Tags
                </span>
                <input
                  value={tagsText}
                  onChange={(event) => setTagsText(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                  placeholder="tplink, archer, tr181"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Observações técnicas
              </span>
              <textarea
                value={editing.notes || ''}
                onChange={(event) =>
                  setEditing((current) =>
                    current ? { ...current, notes: event.target.value } : current,
                  )
                }
                rows={5}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
                placeholder="Ex: modelo suporta Guest via TR-069, mas não expõe VLAN por SSID."
              />
            </label>
          </section>
        )}

        <div className="mb-6 flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
          <Search className="mr-3 text-slate-500" size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            placeholder="Buscar por fabricante, modelo, product class, tag ou observação..."
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando perfis...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum perfil cadastrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                          profile.status,
                        )}`}
                      >
                        {statusLabel(profile.status)}
                      </span>

                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                        {profile.rootObject}
                      </span>

                      {profile.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-xl font-bold text-white">
                      {profile.displayName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {profile.manufacturer} · {profile.model} · Product Class:{' '}
                      {profile.productClass}
                    </p>

                    {profile.notes && (
                      <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm text-slate-400">
                        {profile.notes}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-600">
                      Atualizado em {formatDate(profile.updatedAt)} · Por:{' '}
                      {profile.updatedByEmail || '-'}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(profile)}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                    >
                      <Edit3 size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => removeProfile(profile)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Paths conhecidos
                    </p>
                    <div className="space-y-2 text-xs">
                      {Object.entries(profile.parameterMap || {})
                        .filter(([, value]) => Boolean(value))
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key}>
                            <p className="text-slate-500">{key}</p>
                            <p className="break-all font-mono text-slate-300">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.capabilities || {}).map(([key, value]) => (
                        <span
                          key={key}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            value
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700 bg-slate-950 text-slate-500'
                          }`}
                        >
                          {key}: {value ? 'sim' : 'não'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Templates recomendados
                    </p>
                    {profile.recommendedTemplates?.length ? (
                      <div className="space-y-2">
                        {profile.recommendedTemplates.map((template) => (
                          <p
                            key={template}
                            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                          >
                            {template}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Nenhum template recomendado.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
