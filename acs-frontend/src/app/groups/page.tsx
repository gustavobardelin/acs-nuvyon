// acs-frontend/src/app/groups/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  FolderKanban,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceGroup,
  DeviceGroupPreviewResponse,
} from '@/types/device-groups';
import { ProvisioningTemplate } from '@/types/provisioning-templates';

function statusStyle(status: string) {
  if (status === 'online') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'offline') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'warning') return 'Atenção';
  if (status === 'offline') return 'Offline';
  return 'Todos';
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [previews, setPreviews] = useState<Record<string, DeviceGroupPreviewResponse>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});
  const [applyingGroupId, setApplyingGroupId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: 'Archer C21 de teste',
    description: 'Grupo para testar templates no Archer C21.',
    manufacturer: 'TP-Link',
    model: 'Archer C21',
    productClass: 'Archer C21',
    status: 'online',
    search: '',
    tags: 'teste, tplink, archer-c21',
  });

  const filteredGroups = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return groups;

    return groups.filter((group) => {
      return [
        group.name,
        group.description,
        group.filters?.manufacturer,
        group.filters?.model,
        group.filters?.productClass,
        group.filters?.status,
        ...(group.tags || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [groups, q]);

  async function loadAll() {
    setLoading(true);

    try {
      const [groupsResponse, templatesResponse] = await Promise.all([
        api.get<DeviceGroup[]>('/device-groups'),
        api.get<ProvisioningTemplate[]>('/provisioning-templates'),
      ]);

      setGroups(groupsResponse.data);
      setTemplates(templatesResponse.data.filter((template) => template.status === 'active'));
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar grupos.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!form.name.trim()) {
      alert('Informe o nome do grupo.');
      return;
    }

    setCreating(true);

    try {
      await api.post('/device-groups', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        filters: {
          manufacturer: form.manufacturer.trim() || undefined,
          model: form.model.trim() || undefined,
          productClass: form.productClass.trim() || undefined,
          status: form.status || undefined,
          search: form.search.trim() || undefined,
        },
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      await loadAll();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao criar grupo.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function previewGroup(group: DeviceGroup) {
    try {
      const response = await api.get<DeviceGroupPreviewResponse>(
        `/device-groups/${group.id}/devices`,
        {
          params: {
            limit: 100,
          },
        },
      );

      setPreviews((current) => ({
        ...current,
        [group.id]: response.data,
      }));
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar prévia.',
      );
    }
  }

  async function deleteGroup(group: DeviceGroup) {
    const confirmed = window.confirm(`Excluir o grupo "${group.name}"?`);

    if (!confirmed) return;

    try {
      await api.delete(`/device-groups/${group.id}`);
      await loadAll();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao excluir grupo.',
      );
    }
  }

  async function applyTemplate(group: DeviceGroup) {
    const templateId = selectedTemplate[group.id];

    if (!templateId) {
      alert('Selecione um template.');
      return;
    }

    const preview = previews[group.id];

    if (!preview || preview.devices.length === 0) {
      alert('Faça a prévia do grupo antes de aplicar.');
      return;
    }

    const template = templates.find((item) => item.id === templateId);

    const confirmed = window.confirm(
      `Aplicar "${template?.name}" em ${preview.devices.length} dispositivo(s) do grupo "${group.name}"?`,
    );

    if (!confirmed) return;

    setApplyingGroupId(group.id);

    try {
      const response = await api.post(
        `/device-groups/${group.id}/apply-template/${templateId}`,
        {
          limit: preview.devices.length,
          dryRun: false,
        },
      );

      alert(
        `Finalizado: ${response.data.successCount} sucesso(s), ${response.data.failedCount} falha(s).`,
      );

      await previewGroup(group);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao aplicar template no grupo.',
      );
    } finally {
      setApplyingGroupId(null);
    }
  }

  useEffect(() => {
    loadAll();
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <FolderKanban size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Device Groups
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Grupos dinâmicos baseados em filtros. Use para aplicar templates em conjuntos de CPEs.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            Atualizar
          </button>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Novo grupo
            </p>
            <h2 className="mt-2 text-xl font-bold">Criar grupo dinâmico</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Nome do grupo"
            />

            <input
              value={form.manufacturer}
              onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Manufacturer"
            />

            <input
              value={form.model}
              onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Modelo"
            />

            <input
              value={form.productClass}
              onChange={(event) => setForm((current) => ({ ...current, productClass: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Product Class"
            />

            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
            >
              <option value="">Todos os status</option>
              <option value="online">Online</option>
              <option value="warning">Atenção</option>
              <option value="offline">Offline</option>
            </select>

            <input
              value={form.search}
              onChange={(event) => setForm((current) => ({ ...current, search: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Busca livre"
            />

            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Tags"
            />

            <button
              type="button"
              onClick={createGroup}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
            >
              {creating ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
              Criar grupo
            </button>
          </div>

          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={2}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="Descrição"
          />
        </div>

        <div className="mb-6 flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
          <Search className="mr-3 text-slate-500" size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            placeholder="Buscar grupos..."
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando grupos...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum grupo encontrado.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredGroups.map((group) => {
              const preview = previews[group.id];

              return (
                <div
                  key={group.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{group.name}</h2>

                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {group.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400">
                        {group.description || 'Sem descrição.'}
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-5">
                        <div className="rounded-xl bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Manufacturer</p>
                          <p className="mt-1 font-semibold">{group.filters?.manufacturer || '-'}</p>
                        </div>

                        <div className="rounded-xl bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Modelo</p>
                          <p className="mt-1 font-semibold">{group.filters?.model || '-'}</p>
                        </div>

                        <div className="rounded-xl bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Product Class</p>
                          <p className="mt-1 font-semibold">{group.filters?.productClass || '-'}</p>
                        </div>

                        <div className="rounded-xl bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="mt-1 font-semibold">{statusLabel(group.filters?.status || '')}</p>
                        </div>

                        <div className="rounded-xl bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Prévia</p>
                          <p className="mt-1 font-semibold">
                            {preview ? `${preview.matchedCount} CPE(s)` : '-'}
                          </p>
                        </div>
                      </div>

                      {preview && (
                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                          <div className="mb-3 flex items-center gap-2 text-emerald-300">
                            <CheckCircle size={17} />
                            <p className="font-semibold">
                              {preview.matchedCount} dispositivo(s) encontrado(s)
                            </p>
                          </div>

                          <div className="max-h-72 space-y-2 overflow-y-auto">
                            {preview.devices.map((device) => (
                              <div
                                key={device.id}
                                className="rounded-xl bg-slate-950/70 p-3"
                              >
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="break-all font-mono text-sm">{device.id}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {device.manufacturer} · {device.model} · SN {device.serialNumber}
                                    </p>
                                  </div>

                                  <span
                                    className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusStyle(device.status)}`}
                                  >
                                    {statusLabel(device.status)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-[280px] shrink-0 flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => previewGroup(group)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        <Search size={16} />
                        Prévia
                      </button>

                      <select
                        value={selectedTemplate[group.id] || ''}
                        onChange={(event) =>
                          setSelectedTemplate((current) => ({
                            ...current,
                            [group.id]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                      >
                        <option value="">Selecionar template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => applyTemplate(group)}
                        disabled={applyingGroupId === group.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {applyingGroupId === group.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                        Aplicar template
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteGroup(group)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 size={16} />
                        Excluir grupo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
