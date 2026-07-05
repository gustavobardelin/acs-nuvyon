'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle,
  ExternalLink,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { calculateDeviceHealth } from '@/lib/device-health';
import { DeviceSummary } from '@/types/devices';
import { DeviceAlert } from '@/types/device-alerts';
import { ModelProfile } from '@/types/model-profiles';

type ModelInventoryItem = {
  key: string;
  manufacturer: string;
  model: string;
  productClass: string;
  total: number;
  online: number;
  warning: number;
  offline: number;
  averageHealth: number;
  alerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  devices: DeviceSummary[];
  profile: ModelProfile | null;
};

function normalize(value: unknown) {
  return String(value || '-').trim() || '-';
}

function modelKey(manufacturer: unknown, model: unknown, productClass: unknown) {
  return `${normalize(manufacturer)}::${normalize(model)}::${normalize(productClass)}`;
}

function statusPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function healthStyle(score: number) {
  if (score >= 80) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (score >= 50) return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function profileStyle(profile: ModelProfile | null) {
  if (!profile) return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (profile.status === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (profile.status === 'draft') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function profileLabel(profile: ModelProfile | null) {
  if (!profile) return 'Sem perfil';
  if (profile.status === 'active') return 'Perfil ativo';
  if (profile.status === 'draft') return 'Perfil rascunho';
  if (profile.status === 'deprecated') return 'Perfil depreciado';
  return profile.status;
}

export default function InventoryPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingProfileKey, setCreatingProfileKey] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const profilesByKey = useMemo(() => {
    const map = new Map<string, ModelProfile>();

    for (const profile of profiles) {
      map.set(modelKey(profile.manufacturer, profile.model, profile.productClass), profile);
    }

    return map;
  }, [profiles]);

  const inventory = useMemo<ModelInventoryItem[]>(() => {
    const alertCountByDevice = new Map<string, DeviceAlert[]>();

    for (const alert of alerts) {
      if (alert.status === 'RESOLVED') continue;

      const current = alertCountByDevice.get(alert.deviceId) || [];
      current.push(alert);
      alertCountByDevice.set(alert.deviceId, current);
    }

    const map = new Map<string, ModelInventoryItem>();

    for (const device of devices) {
      const manufacturer = normalize((device as any).manufacturer);
      const model = normalize((device as any).model);
      const productClass = normalize((device as any).productClass);
      const key = modelKey(manufacturer, model, productClass);

      if (!map.has(key)) {
        map.set(key, {
          key,
          manufacturer,
          model,
          productClass,
          total: 0,
          online: 0,
          warning: 0,
          offline: 0,
          averageHealth: 0,
          alerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          devices: [],
          profile: profilesByKey.get(key) || null,
        });
      }

      const item = map.get(key)!;
      item.total += 1;
      item.devices.push(device);

      if ((device as any).status === 'online') item.online += 1;
      else if ((device as any).status === 'warning') item.warning += 1;
      else item.offline += 1;

      const deviceAlerts = alertCountByDevice.get(device.id) || [];

      item.alerts += deviceAlerts.length;
      item.criticalAlerts += deviceAlerts.filter(
        (alert) => alert.severity === 'critical',
      ).length;
      item.warningAlerts += deviceAlerts.filter(
        (alert) => alert.severity === 'warning',
      ).length;
    }

    const items = Array.from(map.values()).map((item) => {
      const totalHealth = item.devices.reduce((sum, device) => {
        return sum + calculateDeviceHealth(device).score;
      }, 0);

      return {
        ...item,
        averageHealth: item.total > 0 ? Math.round(totalHealth / item.total) : 0,
        profile: profilesByKey.get(item.key) || null,
      };
    });

    return items.sort((a, b) => {
      if (!a.profile && b.profile) return -1;
      if (a.profile && !b.profile) return 1;

      if (b.criticalAlerts !== a.criticalAlerts) {
        return b.criticalAlerts - a.criticalAlerts;
      }

      if (a.averageHealth !== b.averageHealth) {
        return a.averageHealth - b.averageHealth;
      }

      return b.total - a.total;
    });
  }, [devices, alerts, profilesByKey]);

  const filteredInventory = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return inventory;

    return inventory.filter((item) => {
      const haystack = [
        item.manufacturer,
        item.model,
        item.productClass,
        item.total,
        item.averageHealth,
        item.profile?.displayName,
        item.profile?.status,
        item.profile?.tags?.join(' '),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [inventory, q]);

  const totalModels = inventory.length;
  const totalDevices = devices.length;
  const totalAlerts = inventory.reduce((sum, item) => sum + item.alerts, 0);
  const modelsWithoutProfile = inventory.filter((item) => !item.profile).length;
  const draftProfiles = inventory.filter((item) => item.profile?.status === 'draft').length;
  const worstModel = inventory[0];

  async function load() {
    setLoading(true);

    try {
      const [devicesResponse, alertsResponse, profilesResponse] = await Promise.all([
        api.get<DeviceSummary[]>('/devices'),
        api.get<DeviceAlert[]>('/device-alerts'),
        api.get<ModelProfile[]>('/model-profiles'),
      ]);

      setDevices(devicesResponse.data || []);
      setAlerts(alertsResponse.data || []);
      setProfiles(profilesResponse.data || []);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar inventário.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createProfileForItem(item: ModelInventoryItem) {
    const confirmed = window.confirm(
      `Criar perfil técnico para ${item.manufacturer} ${item.model} (${item.productClass})?`,
    );

    if (!confirmed) return;

    setCreatingProfileKey(item.key);

    try {
      await api.post<ModelProfile>('/model-profiles', {
        displayName: [item.manufacturer, item.model]
          .filter((value) => value && value !== '-')
          .join(' '),
        manufacturer: item.manufacturer,
        model: item.model,
        productClass: item.productClass,
        rootObject: 'unknown',
        status: 'draft',
        parameterMap: {},
        capabilities: {},
        recommendedTemplates: [],
        tags: [item.manufacturer, item.model, item.productClass]
          .filter((value) => value && value !== '-')
          .map((value) => value.toLowerCase().replace(/\s+/g, '-')),
        notes:
          'Perfil criado automaticamente pelo Inventário. Completar paths conhecidos, capabilities, templates recomendados e observações técnicas.',
      });

      await load();

      alert('Perfil criado como rascunho. Abra a Base de Modelos para completar.');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao criar perfil do modelo.',
      );
    } finally {
      setCreatingProfileKey(null);
    }
  }

  useEffect(() => {
    load();
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <Boxes size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Inventário Inteligente
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Visão consolidada por fabricante, modelo e product class, com status,
              alertas, Health Score médio e cobertura da Base de Modelos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/model-profiles"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <BookOpen size={17} />
              Base de modelos
            </a>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <Monitor className="text-sky-400" size={24} />
            <p className="mt-4 text-sm text-slate-500">CPEs</p>
            <p className="mt-2 text-3xl font-bold">{totalDevices}</p>
          </div>

          <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-6">
            <Boxes className="text-cyan-300" size={24} />
            <p className="mt-4 text-sm text-cyan-200/70">Modelos únicos</p>
            <p className="mt-2 text-3xl font-bold text-cyan-200">
              {totalModels}
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <BookOpen className="text-red-300" size={24} />
            <p className="mt-4 text-sm text-red-200/70">Sem perfil</p>
            <p className="mt-2 text-3xl font-bold text-red-200">
              {modelsWithoutProfile}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <AlertTriangle className="text-amber-300" size={24} />
            <p className="mt-4 text-sm text-amber-200/70">Rascunhos</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">
              {draftProfiles}
            </p>
          </div>

          <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-6">
            <BarChart3 className="text-violet-300" size={24} />
            <p className="mt-4 text-sm text-violet-200/70">Prioridade</p>
            <p className="mt-2 truncate text-lg font-bold text-violet-200">
              {worstModel ? worstModel.model : '-'}
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
          <Search className="mr-3 text-slate-500" size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            placeholder="Buscar por fabricante, modelo, product class ou status do perfil..."
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando inventário...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum modelo encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredInventory.map((item) => (
              <div
                key={item.key}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                        {item.manufacturer}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthStyle(
                          item.averageHealth,
                        )}`}
                      >
                        Health médio {item.averageHealth}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${profileStyle(
                          item.profile,
                        )}`}
                      >
                        {profileLabel(item.profile)}
                      </span>

                      {item.alerts > 0 && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                          {item.alerts} alerta(s)
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-white">
                      {item.model}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Product Class: {item.productClass}
                    </p>

                    {item.profile && (
                      <p className="mt-2 text-sm text-violet-300">
                        Perfil: {item.profile.displayName}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 xl:w-[720px]">
                    <div className="grid gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="mt-1 text-2xl font-bold text-white">
                          {item.total}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <CheckCircle size={15} />
                          <p className="text-xs">Online</p>
                        </div>
                        <p className="mt-1 text-xl font-bold text-emerald-200">
                          {item.online}
                        </p>
                        <p className="text-xs text-emerald-200/60">
                          {statusPercent(item.online, item.total)}%
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center gap-2 text-amber-300">
                          <AlertTriangle size={15} />
                          <p className="text-xs">Atenção</p>
                        </div>
                        <p className="mt-1 text-xl font-bold text-amber-200">
                          {item.warning}
                        </p>
                        <p className="text-xs text-amber-200/60">
                          {statusPercent(item.warning, item.total)}%
                        </p>
                      </div>

                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                        <div className="flex items-center gap-2 text-red-300">
                          <XCircle size={15} />
                          <p className="text-xs">Offline</p>
                        </div>
                        <p className="mt-1 text-xl font-bold text-red-200">
                          {item.offline}
                        </p>
                        <p className="text-xs text-red-200/60">
                          {statusPercent(item.offline, item.total)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.profile ? (
                        <a
                          href="/model-profiles"
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
                        >
                          <ExternalLink size={15} />
                          Abrir perfil
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => createProfileForItem(item)}
                          disabled={creatingProfileKey === item.key}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {creatingProfileKey === item.key ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Plus size={15} />
                          )}
                          Criar perfil técnico
                        </button>
                      )}

                      <a
                        href={`/devices/${encodeURIComponent(item.devices[0]?.id || '')}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        <ExternalLink size={15} />
                        Abrir CPE exemplo
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Dispositivos deste modelo
                  </p>

                  <div className="grid gap-2">
                    {item.devices.slice(0, 8).map((device) => (
                      <a
                        key={device.id}
                        href={`/devices/${encodeURIComponent(device.id)}`}
                        className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 transition hover:border-sky-500/40 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="break-all font-mono text-xs text-slate-300">
                            {device.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            SN: {(device as any).serialNumber || '-'} · WAN:{' '}
                            {(device as any).ip || '-'}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                          {(device as any).status || '-'}
                        </span>
                      </a>
                    ))}

                    {item.devices.length > 8 && (
                      <p className="text-xs text-slate-600">
                        + {item.devices.length - 8} dispositivo(s) oculto(s) nesta prévia.
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
