'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldOff,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RemediationPlaybookCard } from '@/components/alerts/RemediationPlaybookCard';
import {
  DeviceAlert,
  DeviceAlertStatus,
  DeviceAlertSummary,
} from '@/types/device-alerts';

function severityLabel(severity: string) {
  if (severity === 'critical') return 'Crítico';
  if (severity === 'warning') return 'Atenção';
  return 'Info';
}

function severityStyle(severity: string) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
}

function statusStyle(status: string) {
  if (status === 'OPEN') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'ACKNOWLEDGED') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (status === 'SILENCED') return 'border-slate-700 bg-slate-900 text-slate-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
}

function statusLabel(status: string) {
  if (status === 'OPEN') return 'Aberto';
  if (status === 'ACKNOWLEDGED') return 'Reconhecido';
  if (status === 'SILENCED') return 'Silenciado';
  if (status === 'RESOLVED') return 'Resolvido';
  return status;
}

function severityIcon(severity: string) {
  if (severity === 'critical') return <XCircle size={16} />;
  if (severity === 'warning') return <AlertTriangle size={16} />;
  return <CheckCircle size={16} />;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    connectivity: 'Conectividade',
    inform: 'Inform',
    identity: 'Identificação',
    ip: 'IP/WAN',
    health: 'Health',
    wifi: 'Wi-Fi',
    system: 'Sistema',
  };

  return labels[category] || category;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [summary, setSummary] = useState<DeviceAlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [includeResolved, setIncludeResolved] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    const search = q.trim().toLowerCase();

    return alerts.filter((alert) => {
      if (severity && alert.severity !== severity) return false;
      if (category && alert.category !== category) return false;
      if (status && alert.status !== status) return false;

      if (!search) return true;

      const haystack = [
        alert.title,
        alert.description,
        alert.category,
        alert.severity,
        alert.status,
        alert.note,
        alert.resolutionNote,
        alert.device.id,
        alert.device.manufacturer,
        alert.device.model,
        alert.device.productClass,
        alert.device.serialNumber,
        alert.device.ip,
        alert.device.lanIp,
        alert.device.status,
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [alerts, q, severity, category, status]);

  async function loadAlerts() {
    setLoading(true);

    try {
      const [alertsResponse, summaryResponse] = await Promise.all([
        api.get<DeviceAlert[]>('/device-alerts', {
          params: {
            includeResolved,
          },
        }),
        api.get<DeviceAlertSummary>('/device-alerts/summary'),
      ]);

      setAlerts(alertsResponse.data);
      setSummary(summaryResponse.data);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar alertas.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAlertAction(
    alert: DeviceAlert,
    action: 'acknowledge' | 'silence' | 'resolve' | 'reopen',
  ) {
    let body: Record<string, any> = {};

    if (action === 'acknowledge') {
      const note = window.prompt(
        'Observação do reconhecimento:',
        'Verificado pelo NOC.',
      );

      if (note === null) return;

      body = { note };
    }

    if (action === 'silence') {
      const reason = window.prompt(
        'Motivo do silenciamento:',
        'Equipamento em laboratório / cenário esperado.',
      );

      if (reason === null) return;

      body = { reason };
    }

    if (action === 'resolve') {
      const note = window.prompt(
        'Observação da resolução:',
        'Alerta resolvido manualmente.',
      );

      if (note === null) return;

      body = { note };
    }

    setActionLoading(`${alert.id}:${action}`);

    try {
      await api.patch(
        `/device-alerts/${encodeURIComponent(alert.id)}/${action}`,
        body,
      );

      await loadAlerts();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao atualizar alerta.',
      );
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [includeResolved]);

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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
                <Bell size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Alertas Persistentes
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Alertas com estado persistente: aberto, reconhecido, silenciado e resolvido.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAlerts}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            Atualizar
          </button>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <Bell className="text-sky-400" size={24} />
            <p className="mt-4 text-sm text-slate-500">Alertas operacionais</p>
            <p className="mt-2 text-3xl font-bold">{summary?.total || 0}</p>
          </div>

          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <XCircle className="text-red-300" size={24} />
            <p className="mt-4 text-sm text-red-200/70">Abertos</p>
            <p className="mt-2 text-3xl font-bold text-red-200">
              {summary?.open || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <AlertTriangle className="text-amber-300" size={24} />
            <p className="mt-4 text-sm text-amber-200/70">Reconhecidos</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">
              {summary?.acknowledged || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <ShieldOff className="text-slate-400" size={24} />
            <p className="mt-4 text-sm text-slate-500">Silenciados</p>
            <p className="mt-2 text-3xl font-bold">
              {summary?.silenced || 0}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_190px_190px_190px_190px]">
          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
            <Search className="mr-3 text-slate-500" size={18} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Buscar por CPE, modelo, serial, IP ou descrição..."
            />
          </div>

          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-white outline-none"
          >
            <option value="">Severidade</option>
            <option value="critical">Crítico</option>
            <option value="warning">Atenção</option>
            <option value="info">Info</option>
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-white outline-none"
          >
            <option value="">Status</option>
            <option value="OPEN">Aberto</option>
            <option value="ACKNOWLEDGED">Reconhecido</option>
            <option value="SILENCED">Silenciado</option>
            <option value="RESOLVED">Resolvido</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-white outline-none"
          >
            <option value="">Categoria</option>
            <option value="connectivity">Conectividade</option>
            <option value="inform">Inform</option>
            <option value="identity">Identificação</option>
            <option value="ip">IP/WAN</option>
            <option value="health">Health</option>
            <option value="wifi">Wi-Fi</option>
            <option value="system">Sistema</option>
          </select>

          <button
            type="button"
            onClick={() => setIncludeResolved((current) => !current)}
            className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
              includeResolved
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                : 'border-slate-800 bg-slate-950/80 text-slate-400'
            }`}
          >
            {includeResolved ? 'Com resolvidos' : 'Sem resolvidos'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando alertas...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum alerta encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${severityStyle(
                          alert.severity,
                        )}`}
                      >
                        {severityIcon(alert.severity)}
                        {severityLabel(alert.severity)}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                          alert.status,
                        )}`}
                      >
                        {statusLabel(alert.status)}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                        {categoryLabel(alert.category)}
                      </span>

                      {!alert.isActive && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Não ativo
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold">{alert.title}</h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {alert.description}
                    </p>

                    <RemediationPlaybookCard alert={alert} onUpdated={loadAlerts} />

                    {alert.note && (
                      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
                        Nota: {alert.note}
                      </div>
                    )}

                    {alert.resolutionNote && (
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                        Resolução: {alert.resolutionNote}
                      </div>
                    )}

                    <p className="mt-4 break-all font-mono text-xs text-slate-500">
                      {alert.device.id}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {alert.device.manufacturer} · {alert.device.model} · SN{' '}
                      {alert.device.serialNumber}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Primeiro visto: {formatDate(alert.firstSeenAt)} · Último visto:{' '}
                      {formatDate(alert.lastSeenAt)} · Ocorrências:{' '}
                      {alert.occurrenceCount}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 lg:w-[420px]">
                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Status CPE</p>
                        <p className="mt-1 font-semibold">
                          {alert.device.status}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">WAN</p>
                        <p className="mt-1 font-semibold">{alert.device.ip}</p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Último inform</p>
                        <p className="mt-1 font-semibold">
                          {formatDate(alert.device.lastContact)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/devices/${encodeURIComponent(alert.deviceId)}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                      >
                        <Eye size={15} />
                        Abrir CPE
                      </a>

                      {alert.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => runAlertAction(alert, 'acknowledge')}
                          disabled={actionLoading !== null}
                          className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300"
                        >
                          Reconhecer
                        </button>
                      )}

                      {(alert.status === 'OPEN' ||
                        alert.status === 'ACKNOWLEDGED') && (
                        <button
                          type="button"
                          onClick={() => runAlertAction(alert, 'silence')}
                          disabled={actionLoading !== null}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300"
                        >
                          Silenciar
                        </button>
                      )}

                      {alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => runAlertAction(alert, 'resolve')}
                          disabled={actionLoading !== null}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300"
                        >
                          Resolver
                        </button>
                      )}

                      {alert.status !== 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => runAlertAction(alert, 'reopen')}
                          disabled={actionLoading !== null}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300"
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
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
