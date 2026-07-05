'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Wifi,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { HealthScorePill } from '@/components/device/HealthScorePill';

type DeviceItem = {
  id: string;
  manufacturer?: string;
  model?: string;
  productClass?: string;
  serialNumber?: string;
  ip?: string;
  lanIp?: string;
  pppoeUsername?: string;
  status?: 'online' | 'warning' | 'offline' | string;
  lastContact?: string | null;
};

function statusLabel(status?: string) {
  if (status === 'online') return 'Online';
  if (status === 'warning') return 'Atenção';
  if (status === 'offline') return 'Offline';
  return status || '-';
}

function statusStyle(status?: string) {
  if (status === 'online') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (status === 'offline') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function statusIcon(status?: string) {
  if (status === 'online') return <CheckCircle size={15} />;
  if (status === 'warning') return <AlertTriangle size={15} />;
  if (status === 'offline') return <XCircle size={15} />;
  return <Activity size={15} />;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filteredDevices = useMemo(() => {
    const search = q.trim().toLowerCase();

    return devices.filter((device) => {
      if (status && device.status !== status) return false;

      if (!search) return true;

      const haystack = [
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
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [devices, q, status]);

  const onlineCount = devices.filter((device) => device.status === 'online').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;

  async function loadDevices() {
    setLoading(true);

    try {
      const response = await api.get<DeviceItem[]>('/devices');
      setDevices(response.data || []);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar dispositivos.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-300">
                <Monitor size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Dispositivos monitorados
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Lista geral de CPEs sincronizados pelo GenieACS.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDevices}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            Atualizar
          </button>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <Monitor className="text-sky-400" size={24} />
            <p className="mt-4 text-sm text-slate-500">Total de CPEs</p>
            <p className="mt-2 text-3xl font-bold">{devices.length}</p>
          </div>

          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <CheckCircle className="text-emerald-300" size={24} />
            <p className="mt-4 text-sm text-emerald-200/70">Online</p>
            <p className="mt-2 text-3xl font-bold text-emerald-200">
              {onlineCount}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <AlertTriangle className="text-amber-300" size={24} />
            <p className="mt-4 text-sm text-amber-200/70">Atenção</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">
              {warningCount}
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <XCircle className="text-red-300" size={24} />
            <p className="mt-4 text-sm text-red-200/70">Offline</p>
            <p className="mt-2 text-3xl font-bold text-red-200">
              {offlineCount}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
            <Search className="mr-3 text-slate-500" size={18} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Buscar por modelo, serial, ID, IP, PPPoE..."
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-white outline-none"
          >
            <option value="">Todos status</option>
            <option value="online">Online</option>
            <option value="warning">Atenção</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando dispositivos...
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum dispositivo encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDevices.map((device) => (
              <a
                key={device.id}
                href={`/devices/${encodeURIComponent(device.id)}`}
                className="block rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-sky-500/40 hover:bg-slate-950"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <HealthScorePill device={device} />

                      <span
                        className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                          device.status,
                        )}`}
                      >
                        {statusIcon(device.status)}
                        {statusLabel(device.status)}
                      </span>

                      {device.manufacturer && (
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                          {device.manufacturer}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold">
                      {device.model || device.productClass || 'CPE sem modelo'}
                    </h2>

                    <p className="mt-2 break-all font-mono text-xs text-slate-500">
                      {device.id}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      SN: {device.serialNumber || '-'} · Product Class:{' '}
                      {device.productClass || '-'}
                    </p>
                  </div>

                  <div className="grid shrink-0 gap-3 text-sm md:grid-cols-3 lg:w-[560px]">
                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-slate-500">
                        <Wifi size={14} />
                        <p className="text-xs">WAN</p>
                      </div>
                      <p className="font-semibold">{device.ip || '-'}</p>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">LAN</p>
                      <p className="mt-1 font-semibold">{device.lanIp || '-'}</p>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Último inform</p>
                      <p className="mt-1 font-semibold">
                        {formatDate(device.lastContact)}
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
