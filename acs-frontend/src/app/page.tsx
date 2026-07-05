'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Cpu,
  FileSliders,
  FolderKanban,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Rocket,
  Router,
  Search,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardAlertsPanel } from '@/components/alerts/DashboardAlertsPanel';
import { calculateDeviceHealth } from '@/lib/device-health';
import { DeviceSummary } from '@/types/devices';
import { ProvisioningTemplate } from '@/types/provisioning-templates';
import { DeviceGroup } from '@/types/device-groups';
import { ProvisioningJob } from '@/types/provisioning-jobs';
import { HealthScorePill } from '@/components/device/HealthScorePill';

function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'warning') return 'Atenção';
  if (status === 'offline') return 'Offline';
  return status || '-';
}

function deviceStatusStyle(status: string) {
  if (status === 'online') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function jobStatusStyle(status: string) {
  if (status === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'RUNNING') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }

  if (status === 'FAILED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return '-';

  if (ms < 1000) return `${ms}ms`;

  return `${Math.round(ms / 1000)}s`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  href,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-sky-500/40 hover:bg-slate-950">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
          {icon}
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );

  if (!href) return content;

  return <a href={href}>{content}</a>;
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [jobs, setJobs] = useState<ProvisioningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const onlineCount = devices.filter((device) => device.status === 'online').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;

  const healthResults = devices.map((device) => calculateDeviceHealth(device));
  const healthyHealthCount = healthResults.filter((item) => item.level === 'healthy').length;
  const attentionHealthCount = healthResults.filter((item) => item.level === 'attention').length;
  const criticalHealthCount = healthResults.filter((item) => item.level === 'critical').length;
  const averageHealthScore =
    healthResults.length > 0
      ? Math.round(
          healthResults.reduce((total, item) => total + item.score, 0) /
            healthResults.length,
        )
      : 0;

  const activeTemplates = templates.filter((template) => template.status === 'active');
  const activeGroups = groups.filter((group) => group.status === 'active');

  const completedJobs = jobs.filter((job) => job.status === 'COMPLETED').length;
  const failedJobs = jobs.filter((job) => job.status === 'FAILED').length;
  const runningJobs = jobs.filter((job) => job.status === 'RUNNING').length;

  const filteredDevices = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return devices.slice(0, 20);

    return devices
      .filter((device) => {
        return [
          device.id,
          device.manufacturer,
          device.model,
          device.productClass,
          device.serialNumber,
          device.ip,
          device.lanIp,
          device.pppoeUsername,
          device.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .slice(0, 40);
  }, [devices, q]);

  const recentJobs = useMemo(() => jobs.slice(0, 6), [jobs]);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [devicesResponse, templatesResponse, groupsResponse, jobsResponse] =
        await Promise.all([
          api.get<DeviceSummary[]>('/devices'),
          api.get<ProvisioningTemplate[]>('/provisioning-templates', {
            params: { includeInactive: true },
          }),
          api.get<DeviceGroup[]>('/device-groups'),
          api.get<ProvisioningJob[]>('/provisioning-jobs'),
        ]);

      setDevices(devicesResponse.data);
      setTemplates(templatesResponse.data);
      setGroups(groupsResponse.data);
      setJobs(jobsResponse.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <Activity size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Dashboard Operacional
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Visão geral dos CPEs, templates, grupos e campanhas de provisionamento.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/alerts"
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <Bell size={17} />
              Alertas
            </a>

            <a
              href="/templates"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <FileSliders size={17} />
              Templates
            </a>

            <a
              href="/groups"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <FolderKanban size={17} />
              Groups
            </a>

            <a
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <Rocket size={17} />
              Jobs
            </a>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Health saudável"
            value={healthyHealthCount}
            subtitle="CPEs com score entre 80 e 100"
            icon={<CheckCircle size={24} />}
          />

          <MetricCard
            title="Health em atenção"
            value={attentionHealthCount}
            subtitle="CPEs com score entre 50 e 79"
            icon={<AlertTriangle size={24} />}
          />

          <MetricCard
            title="Health crítico"
            value={criticalHealthCount}
            subtitle="CPEs com score abaixo de 50"
            icon={<XCircle size={24} />}
          />

          <MetricCard
            title="Health médio"
            value={averageHealthScore}
            subtitle="Média geral dos CPEs"
            icon={<Activity size={24} />}
          />
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="CPEs online"
            value={onlineCount}
            subtitle={`${devices.length} dispositivo(s) no total`}
            icon={<CheckCircle size={24} />}
          />

          <MetricCard
            title="CPEs em atenção"
            value={warningCount}
            subtitle="Inform recente, mas fora do ideal"
            icon={<AlertTriangle size={24} />}
          />

          <MetricCard
            title="CPEs offline"
            value={offlineCount}
            subtitle="Sem inform dentro do limite"
            icon={<WifiOff size={24} />}
          />

          <MetricCard
            title="Templates ativos"
            value={activeTemplates.length}
            subtitle={`${templates.length} template(s) cadastrados`}
            icon={<FileSliders size={24} />}
            href="/templates"
          />
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <MetricCard
            title="Grupos ativos"
            value={activeGroups.length}
            subtitle={`${groups.length} grupo(s) cadastrados`}
            icon={<FolderKanban size={24} />}
            href="/groups"
          />

          <MetricCard
            title="Campanhas concluídas"
            value={completedJobs}
            subtitle={`${jobs.length} campanha(s) registradas`}
            icon={<Rocket size={24} />}
            href="/jobs"
          />

          <MetricCard
            title="Campanhas com falha"
            value={failedJobs}
            subtitle={runningJobs > 0 ? `${runningJobs} em execução` : 'Nenhuma em execução'}
            icon={<XCircle size={24} />}
            href="/jobs"
          />
        </div>

        <div className="mb-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sky-400">
                  <MonitorSmartphone size={18} />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    CPEs
                  </p>
                </div>

                <h2 className="text-xl font-bold">Dispositivos monitorados</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lista rápida dos CPEs carregados do GenieACS.
                </p>
              </div>

              <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-900/80 px-4">
                <Search className="mr-3 text-slate-500" size={17} />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
                  placeholder="Buscar CPE..."
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={17} />
                Carregando dispositivos...
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-500">
                Nenhum dispositivo encontrado.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDevices.map((device) => (
                  <a
                    key={device.id}
                    href={`/devices/${encodeURIComponent(device.id)}`}
                    className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-500/40 hover:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <Router className="text-slate-500" size={17} />
                          <p className="truncate font-semibold text-white">
                            {device.manufacturer || '-'} · {device.model || '-'}
                          </p>
                        </div>

                        <p className="break-all font-mono text-xs text-slate-500">
                          {device.id}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          SN {device.serialNumber || '-'} · WAN {device.ip || '-'} · LAN {device.lanIp || '-'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <HealthScorePill device={device} />

                        <span
                          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${deviceStatusStyle(
                            device.status,
                          )}`}
                        >
                          {statusLabel(device.status)}
                        </span>

                        <span className="w-fit rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                          {formatDate(device.lastContact)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-sky-400">
                <Rocket size={18} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Campanhas
                </p>
              </div>

              <h2 className="text-xl font-bold">Últimas campanhas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Histórico central dos jobs de provisionamento.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={17} />
                Carregando campanhas...
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-500">
                Nenhuma campanha executada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <a
                    key={job.id}
                    href="/jobs"
                    className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-500/40 hover:bg-slate-900"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{job.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {job.templateName} → {job.groupName}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${jobStatusStyle(
                          job.status,
                        )}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-950/70 p-2">
                        <p className="text-slate-600">Alvos</p>
                        <p className="font-semibold text-white">{job.targetCount}</p>
                      </div>

                      <div className="rounded-xl bg-slate-950/70 p-2">
                        <p className="text-slate-600">OK/Falha</p>
                        <p className="font-semibold text-white">
                          {job.successCount}/{job.failedCount}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950/70 p-2">
                        <p className="text-slate-600">Duração</p>
                        <p className="font-semibold text-white">
                          {formatDuration(job.durationMs)}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sky-400">
              <Cpu size={18} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Operação rápida
              </p>
            </div>

            <h2 className="text-xl font-bold">Atalhos operacionais</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/templates"
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <FileSliders className="text-sky-400" size={24} />
              <p className="mt-3 font-semibold">Biblioteca de Templates</p>
              <p className="mt-1 text-sm text-slate-500">
                Criar, editar e revisar parâmetros TR-069.
              </p>
            </a>

            <a
              href="/groups"
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <FolderKanban className="text-sky-400" size={24} />
              <p className="mt-3 font-semibold">Device Groups</p>
              <p className="mt-1 text-sm text-slate-500">
                Agrupar CPEs por modelo, status e filtros.
              </p>
            </a>

            <a
              href="/jobs"
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <Rocket className="text-sky-400" size={24} />
              <p className="mt-3 font-semibold">Provisioning Jobs</p>
              <p className="mt-1 text-sm text-slate-500">
                Executar campanhas rastreáveis por grupo.
              </p>
            </a>
          </div>
        </section>
        <DashboardAlertsPanel />
      </div>
    </main>
  );
}
