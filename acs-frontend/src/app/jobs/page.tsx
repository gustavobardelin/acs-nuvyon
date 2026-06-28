'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceGroup } from '@/types/device-groups';
import { ProvisioningTemplate } from '@/types/provisioning-templates';
import { ProvisioningJob } from '@/types/provisioning-jobs';

function statusStyle(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'RUNNING') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (status === 'FAILED') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function statusIcon(status: string) {
  if (status === 'COMPLETED') return <CheckCircle size={15} />;
  if (status === 'FAILED') return <XCircle size={15} />;
  return <Clock size={15} />;
}

function formatDate(value: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

function formatDuration(ms: number | null) {
  if (!ms) return '-';

  if (ms < 1000) return `${ms}ms`;

  return `${Math.round(ms / 1000)}s`;
}

export default function ProvisioningJobsPage() {
  const [jobs, setJobs] = useState<ProvisioningJob[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [q, setQ] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    groupId: '',
    templateId: '',
    limit: 20,
  });

  const [preview, setPreview] = useState<any | null>(null);

  const filteredJobs = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return jobs;

    return jobs.filter((job) =>
      [
        job.name,
        job.description,
        job.groupName,
        job.templateName,
        job.status,
        job.createdByEmail,
      ]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(search)),
    );
  }, [jobs, q]);

  async function loadAll() {
    setLoading(true);

    try {
      const [jobsResponse, groupsResponse, templatesResponse] =
        await Promise.all([
          api.get<ProvisioningJob[]>('/provisioning-jobs'),
          api.get<DeviceGroup[]>('/device-groups'),
          api.get<ProvisioningTemplate[]>('/provisioning-templates'),
        ]);

      setJobs(jobsResponse.data);
      setGroups(groupsResponse.data.filter((group) => group.status === 'active'));
      setTemplates(
        templatesResponse.data.filter((template) => template.status === 'active'),
      );

      setForm((current) => ({
        ...current,
        groupId: current.groupId || groupsResponse.data[0]?.id || '',
        templateId: current.templateId || templatesResponse.data[0]?.id || '',
      }));
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar campanhas.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function previewJob() {
    if (!form.groupId || !form.templateId) {
      alert('Selecione grupo e template.');
      return;
    }

    setPreviewLoading(true);

    try {
      const response = await api.post('/provisioning-jobs/preview', {
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        groupId: form.groupId,
        templateId: form.templateId,
        limit: Number(form.limit || 20),
      });

      setPreview(response.data);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao gerar prévia.',
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runJob() {
    if (!preview || preview.devices?.length === 0) {
      alert('Faça a prévia antes de executar.');
      return;
    }

    const confirmed = window.confirm(
      `Executar campanha em ${preview.devices.length} dispositivo(s)?`,
    );

    if (!confirmed) return;

    setRunning(true);

    try {
      const response = await api.post('/provisioning-jobs/run', {
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        groupId: form.groupId,
        templateId: form.templateId,
        limit: Number(form.limit || 20),
      });

      alert(
        `Campanha finalizada: ${response.data.successCount} sucesso(s), ${response.data.failedCount} falha(s).`,
      );

      setPreview(null);
      await loadAll();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao executar campanha.',
      );
    } finally {
      setRunning(false);
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
                <Rocket size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Provisioning Jobs
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Campanhas rastreáveis de aplicação de templates em grupos de CPEs.
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
              Nova campanha
            </p>
            <h2 className="mt-2 text-xl font-bold">
              Executar template em grupo
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Nome da campanha"
            />

            <input
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Descrição"
            />

            <select
              value={form.groupId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  groupId: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
            >
              <option value="">Selecionar grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={form.templateId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  templateId: event.target.value,
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

            <input
              value={form.limit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  limit: Number(event.target.value),
                }))
              }
              type="number"
              min={1}
              max={100}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Limite"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={previewJob}
                disabled={previewLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                {previewLoading ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />}
                Prévia
              </button>

              <button
                type="button"
                onClick={runJob}
                disabled={running || !preview || preview.devices?.length === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {running ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
                Executar
              </button>
            </div>
          </div>

          {preview && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="font-semibold text-white">
                Prévia: {preview.matchedCount} dispositivo(s)
              </h3>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {preview.devices.map((device: any) => (
                  <div
                    key={device.id}
                    className="rounded-xl bg-slate-950/70 p-3"
                  >
                    <p className="break-all font-mono text-sm text-white">
                      {device.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {device.manufacturer} · {device.model} · SN{' '}
                      {device.serialNumber}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
          <Search className="mr-3 text-slate-500" size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            placeholder="Buscar campanhas..."
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando campanhas...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhuma campanha encontrada.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold">{job.name}</h2>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                          job.status,
                        )}`}
                      >
                        {statusIcon(job.status)}
                        {job.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400">
                      {job.description || 'Sem descrição.'}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-5">
                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Grupo</p>
                        <p className="mt-1 font-semibold">{job.groupName}</p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Template</p>
                        <p className="mt-1 font-semibold">{job.templateName}</p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Alvos</p>
                        <p className="mt-1 font-semibold">{job.targetCount}</p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Sucesso/Falha</p>
                        <p className="mt-1 font-semibold">
                          {job.successCount}/{job.failedCount}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Duração</p>
                        <p className="mt-1 font-semibold">
                          {formatDuration(job.durationMs)}
                        </p>
                      </div>
                    </div>

                    {job.errorMessage && (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {job.errorMessage}
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-600">
                      Criado por {job.createdByEmail || '-'} · Início{' '}
                      {formatDate(job.startedAt)} · Finalizado{' '}
                      {formatDate(job.finishedAt)}
                    </p>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-sky-300">
                        Ver resultado bruto
                      </summary>

                      <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-300">
                        {JSON.stringify(job.resultPayload, null, 2)}
                      </pre>
                    </details>
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
