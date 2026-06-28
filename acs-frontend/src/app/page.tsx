// acs-frontend/src/app/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  Loader2,
  LogOut,
  Power,
  RefreshCw,
  Router,
  Search,
  Server,
  Shield,
  Wifi,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceStatus, DeviceSummary } from '@/types/devices';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storageToken = window.localStorage.getItem('acs_token');

  if (storageToken) return storageToken;

  const cookieToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('acs_token='))
    ?.split('=')[1];

  return cookieToken || null;
}

function clearToken() {
  window.localStorage.removeItem('acs_token');
  document.cookie = 'acs_token=; path=/; max-age=0; SameSite=Lax';
}

function formatDate(value: string | null): string {
  if (!value) return 'Nunca';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

function statusLabel(status: DeviceStatus): string {
  if (status === 'online') return 'Online';
  if (status === 'warning') return 'Atenção';
  return 'Offline';
}

function statusClass(status: DeviceStatus): string {
  if (status === 'online') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  }

  if (status === 'warning') {
    return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-400';
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-400">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadDevices() {
    setLoading(true);
    setError('');

    try {
      const token = getToken();

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await api.get<DeviceSummary[]>('/devices');

      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Erro ao buscar dispositivos:', err);

      const status = err?.response?.status;

      if (status === 401) {
        clearToken();
        window.location.href = '/login';
        return;
      }

      setError(
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

  const filteredDevices = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return devices;

    return devices.filter((device) => {
      const text = [
        device.id,
        device.manufacturer,
        device.model,
        device.serialNumber,
        device.productClass,
        device.ip,
        device.pppoe,
        device.softwareVersion,
        device.standard,
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(term);
    });
  }, [devices, search]);

  const total = devices.length;
  const online = devices.filter((device) => device.status === 'online').length;
  const warning = devices.filter((device) => device.status === 'warning').length;
  const offline = devices.filter((device) => device.status === 'offline').length;

  async function handleRefresh(device: DeviceSummary) {
    setSyncingId(device.id);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/refresh`, {
        objectName: '',
      });

      setTimeout(() => {
        loadDevices();
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao sincronizar dispositivo:', err);
      alert(err?.response?.data?.message || 'Falha ao sincronizar dispositivo.');
    } finally {
      setTimeout(() => setSyncingId(null), 2500);
    }
  }

  async function handleReboot(device: DeviceSummary) {
    const confirmed = window.confirm(
      `Deseja realmente reiniciar o equipamento ${device.model}?\n\nID: ${device.id}`,
    );

    if (!confirmed) return;

    setRebootingId(device.id);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/reboot`);
      alert('Comando de reboot enviado com sucesso.');
    } catch (err: any) {
      console.error('Erro ao reiniciar dispositivo:', err);
      alert(err?.response?.data?.message || 'Falha ao reiniciar dispositivo.');
    } finally {
      setTimeout(() => setRebootingId(null), 3000);
    }
  }

  function handleLogout() {
    clearToken();
    window.location.href = '/login';
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <Router size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  ACS Nuvyon
                </h1>
                <p className="text-sm text-slate-500">
                  Dashboard operacional TR-069
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadDevices}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Atualizar
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total"
            value={total}
            subtitle="CPEs no GenieACS"
            icon={Server}
          />

          <KpiCard
            title="Online"
            value={online}
            subtitle="Inform recente"
            icon={Activity}
          />

          <KpiCard
            title="Atenção"
            value={warning}
            subtitle="Sem inform recente"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Offline"
            value={offline}
            subtitle="Possível indisponibilidade"
            icon={Shield}
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Dispositivos</h2>
              <p className="text-sm text-slate-500">
                Lista normalizada via API do GenieACS.
              </p>
            </div>

            <div className="flex w-full items-center rounded-xl border border-slate-700 bg-slate-900 px-4 lg:w-96">
              <Search className="mr-3 text-slate-500" size={18} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por serial, modelo, IP, PPPoE..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-slate-400">
              <Loader2 className="animate-spin text-sky-400" size={22} />
              Carregando dispositivos...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-10 text-center">
              <Router className="mx-auto mb-4 text-slate-600" size={42} />
              <h3 className="text-lg font-bold text-white">
                Nenhum dispositivo encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Verifique se o GenieACS está retornando CPEs ou ajuste a busca.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Dispositivo</th>
                    <th className="px-4 py-4">Serial</th>
                    <th className="px-4 py-4">IP WAN</th>
                    <th className="px-4 py-4">PPPoE</th>
                    <th className="px-4 py-4">Wi-Fi</th>
                    <th className="px-4 py-4">Último contato</th>
                    <th className="px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      className="border-b border-slate-800/70 hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            device.status,
                          )}`}
                        >
                          {statusLabel(device.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-white">
                            {device.model}
                          </p>
                          <p className="text-xs text-slate-500">
                            {device.manufacturer} · {device.standard}
                          </p>
                          <p className="mt-1 max-w-[260px] truncate font-mono text-xs text-slate-600">
                            {device.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-mono text-sm text-slate-300">
                          {device.serialNumber}
                        </p>
                        <p className="text-xs text-slate-600">
                          {device.productClass}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        {device.ip}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        {device.pppoe}
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {device.wifi.slice(0, 2).map((wifi, index) => (
                            <div
                              key={`${device.id}-${wifi.instance || index}`}
                              className="flex items-center gap-2 text-sm text-slate-300"
                            >
                              <Wifi
                                size={14}
                                className={
                                  wifi.enabled
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }
                              />
                              <span className="max-w-[180px] truncate">
                                {wifi.ssid}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-400">
                        {formatDate(device.lastContact)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/devices/${encodeURIComponent(device.id)}`}
                            className="rounded-lg bg-sky-500/10 p-2 text-sky-400 transition hover:bg-sky-500/20"
                            title="Abrir detalhes"
                          >
                            <Eye size={16} />
                          </Link>

                          <button
                            onClick={() => handleRefresh(device)}
                            disabled={syncingId === device.id}
                            className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                            title="Sincronizar"
                          >
                            {syncingId === device.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                          </button>

                          <button
                            onClick={() => handleReboot(device)}
                            disabled={rebootingId === device.id}
                            className="rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                            title="Reiniciar"
                          >
                            {rebootingId === device.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}