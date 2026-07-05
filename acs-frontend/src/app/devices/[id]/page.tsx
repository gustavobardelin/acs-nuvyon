// acs-frontend/src/app/devices/[id]/page.tsx

'use client';


import { ConnectionRequestCard } from '@/components/device/ConnectionRequestCard';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DeviceActionsTimeline } from '@/components/device/DeviceActionsTimeline';
import { DeviceCapabilitiesCard } from '@/components/device/DeviceCapabilitiesCard';
import { ContextualHealthScoreCard } from '@/components/device/ContextualHealthScoreCard';
import { DeviceActiveAlertsCard } from '@/components/device/DeviceActiveAlertsCard';
import { DeviceOperationalProfileCard } from '@/components/device/DeviceOperationalProfileCard';
import { ParameterExplorerCard } from '@/components/device/ParameterExplorerCard';
import { ProvisioningTemplatesCard } from '@/components/device/ProvisioningTemplatesCard';
import { WifiPasswordField } from '@/components/device/WifiPasswordField';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clipboard,
  Cpu,
  Globe,
  HardDrive,
  Laptop,
  Loader2,
  Network,
  Power,
  RefreshCw,
  Router,
  Save,
  Server,
  Shield,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceDetails,
  DeviceHost,
  DeviceStatus,
  DeviceWifiNetwork,
} from '@/types/devices';

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
  if (!value) return 'Nunca informado';

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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2 text-sky-400">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-white">
            {value || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

function HostRow({ host }: { host: DeviceHost }) {
  return (
    <tr className="border-b border-slate-800/70 hover:bg-slate-900/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-800 p-2 text-sky-400">
            {host.interfaceType?.toLowerCase().includes('wi') ? (
              <Smartphone size={16} />
            ) : (
              <Laptop size={16} />
            )}
          </div>

          <div>
            <p className="font-medium text-white">{host.hostname}</p>
            <p className="text-xs text-slate-500">
              {host.interfaceType || '-'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-slate-300">{host.ip}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{host.mac}</td>

      <td className="px-4 py-3">
        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            host.active
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-700 bg-slate-800 text-slate-400'
          }`}
        >
          {host.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
    </tr>
  );
}

function WifiCard({
  network,
  index,
  onEdit,
  onToggle,
  onCopy,
  busy,
}: {
  network: DeviceWifiNetwork;
  index: number;
  onEdit: (network: DeviceWifiNetwork) => void;
  onToggle: (network: DeviceWifiNetwork) => void;
  onCopy: (network: DeviceWifiNetwork) => void;
  busy: boolean;
}) {
  const canEdit = Boolean(network.instance);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Rádio {index + 1} · {network.standard}
          </p>

          <h3 className="mt-1 break-all text-base font-bold text-white">
            {network.ssid}
          </h3>
        </div>


        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            network.enabled
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {network.enabled ? 'Ativo' : 'Desativado'}
        </span>
      </div>

      <div className="space-y-2 text-sm">
          <WifiPasswordField password={network.password} />
       
        <div>
          <p className="text-xs text-slate-500">Instância</p>
          <p className="text-slate-300">{network.instance || '-'}</p>
        </div>

        {network.frequency && (
          <div>
            <p className="text-xs text-slate-500">Frequência</p>
            <p className="text-slate-300">{network.frequency}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(network)}
          disabled={!canEdit || busy}
          className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Editar Wi-Fi
        </button>

        <button
          type="button"
          onClick={() => onToggle(network)}
          disabled={!canEdit || busy}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            network.enabled
              ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          {busy ? 'Enviando...' : network.enabled ? 'Desativar' : 'Ativar'}
        </button>

        <button
          type="button"
          onClick={() => onCopy(network)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}

export default function DeviceDetailsPage() {
  const params = useParams<{ id: string }>();

  const deviceId = useMemo(() => {
    const id = params?.id;

    if (!id) return '';

    return Array.isArray(id) ? id[0] : id;
  }, [params]);

  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [editingWifi, setEditingWifi] = useState<DeviceWifiNetwork | null>(null);
  const [editSsid, setEditSsid] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingWifi, setSavingWifi] = useState(false);
  const [wifiBusyKey, setWifiBusyKey] = useState<string | null>(null);

  async function loadDevice() {
    setLoading(true);
    setError('');

    try {
      const token = getToken();

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await api.get<DeviceDetails>(
        `/devices/${encodeURIComponent(deviceId)}`,
      );

      setDevice(response.data);
    } catch (err: any) {
      console.error('Erro ao buscar detalhes do dispositivo:', err);

      if (err?.response?.status === 401) {
        clearToken();
        window.location.href = '/login';
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar detalhes do dispositivo.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!deviceId) return;

    loadDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  function notify(message: string) {
    setActionMessage(message);

    setTimeout(() => {
      setActionMessage('');
    }, 5000);
  }

  async function handleRefreshObject(objectName: string, label: string) {
    if (!device) return;

    setSyncing(true);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/refresh`, {
        objectName,
      });

      notify(`${label} solicitado com sucesso. Aguarde o próximo Inform/Connection Request.`);

      setTimeout(() => {
        loadDevice();
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao sincronizar objeto:', err);
      alert(err?.response?.data?.message || `Falha ao sincronizar ${label}.`);
    } finally {
      setTimeout(() => setSyncing(false), 2500);
    }
  }

  async function handleRefresh() {
    await handleRefreshObject('', 'Sincronização geral');
  }

  async function handleRefreshWifi() {
    if (!device) return;

    const objectName =
      device.standard === 'TR-098'
        ? 'InternetGatewayDevice.LANDevice.1.WLANConfiguration'
        : 'Device.WiFi';

    await handleRefreshObject(objectName, 'Sincronização de Wi-Fi');
  }

  async function handleRefreshHosts() {
    if (!device) return;

    const objectName =
      device.standard === 'TR-098'
        ? 'InternetGatewayDevice.LANDevice.1.Hosts'
        : 'Device.Hosts';

    await handleRefreshObject(objectName, 'Sincronização de hosts');
  }

  async function handleReboot() {
    if (!device) return;

    const confirmed = window.confirm(
      `Deseja realmente reiniciar o equipamento ${device.model}?\n\nID: ${device.id}`,
    );

    if (!confirmed) return;

    setRebooting(true);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/reboot`);
      notify(
        'Comando de reboot enviado. O CPE pode demorar dependendo do Inform ou Connection Request.',
      );
    } catch (err: any) {
      console.error('Erro ao reiniciar dispositivo:', err);
      alert(err?.response?.data?.message || 'Falha ao reiniciar dispositivo.');
    } finally {
      setTimeout(() => setRebooting(false), 3000);
    }
  }

  function openWifiEditor(network: DeviceWifiNetwork) {
    if (!network.instance) {
      alert('Essa rede Wi-Fi não possui instância identificada para edição.');
      return;
    }

    setEditingWifi(network);
    setEditSsid(network.ssid);

    if (
      network.password &&
      network.password !== '-' &&
      network.password !== 'Oculta / Não Sincronizada'
    ) {
      setEditPassword(network.password);
    } else {
      setEditPassword('');
    }
  }

  function closeWifiEditor() {
    setEditingWifi(null);
    setEditSsid('');
    setEditPassword('');
    setSavingWifi(false);
  }

  async function handleSaveWifi() {
    if (!device || !editingWifi?.instance) return;

    const ssid = editSsid.trim();
    const password = editPassword.trim();

    if (!ssid) {
      alert('O nome da rede Wi-Fi não pode ficar vazio.');
      return;
    }

    if (password && password.length < 8) {
      alert('A senha do Wi-Fi deve possuir no mínimo 8 caracteres.');
      return;
    }

    setSavingWifi(true);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/wifi`, {
        instance: editingWifi.instance,
        ssid,
        password: password || undefined,
        standard: editingWifi.standard,
      });

      notify(
        'Comando de alteração de Wi-Fi enviado. O CPE pode aplicar no próximo Inform/Connection Request.',
      );

      closeWifiEditor();

      setTimeout(() => {
        loadDevice();
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao alterar Wi-Fi:', err);
      alert(err?.response?.data?.message || 'Falha ao alterar Wi-Fi.');
    } finally {
      setSavingWifi(false);
    }
  }

  async function handleToggleWifi(network: DeviceWifiNetwork) {
    if (!device || !network.instance) return;

    const nextStatus = !network.enabled;

    const confirmed = window.confirm(
      `Deseja realmente ${nextStatus ? 'ativar' : 'desativar'} a rede "${network.ssid}"?`,
    );

    if (!confirmed) return;

    const busyKey = `${network.standard}-${network.instance}`;

    setWifiBusyKey(busyKey);

    try {
      await api.post(`/devices/${encodeURIComponent(device.id)}/wifi`, {
        instance: network.instance,
        enabled: nextStatus,
        standard: network.standard,
      });

      notify('Comando de alteração do status Wi-Fi enviado com sucesso.');

      setTimeout(() => {
        loadDevice();
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao alternar Wi-Fi:', err);
      alert(err?.response?.data?.message || 'Falha ao alterar status do Wi-Fi.');
    } finally {
      setTimeout(() => setWifiBusyKey(null), 2500);
    }
  }

  async function handleCopyWifi(network: DeviceWifiNetwork) {
    const text = [
      `SSID: ${network.ssid}`,
      `Senha: ${network.password}`,
      `Status: ${network.enabled ? 'Ativo' : 'Desativado'}`,
      `Padrão: ${network.standard}`,
      `Instância: ${network.instance || '-'}`,
    ].join('\n');

    await copyText(text);
    notify('Dados do Wi-Fi copiados.');
  }

  async function handleCopySummary() {
    if (!device) return;

    const text = [
      `Modelo: ${device.model}`,
      `Fabricante: ${device.manufacturer}`,
      `Serial: ${device.serialNumber}`,
      `Product Class: ${device.productClass}`,
      `Firmware: ${device.softwareVersion}`,
      `IP WAN: ${device.ip}`,
      `IP LAN: ${device.lanIp}`,
      `PPPoE: ${device.pppoe}`,
      `Último contato: ${formatDate(device.lastContact)}`,
      `ID GenieACS: ${device.id}`,
    ].join('\n');

    await copyText(text);
    notify('Resumo do dispositivo copiado.');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="animate-spin text-sky-400" size={22} />
            Carregando detalhes do dispositivo...
          </div>
        </div>
      </main>
    );
  }

  if (error || !device) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
          <Router className="mb-4 text-red-400" size={44} />

          <h1 className="text-2xl font-bold">
            Não foi possível abrir o dispositivo
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            {error ||
              'O equipamento não foi localizado ou a API não retornou dados.'}
          </p>

          <p className="mt-3 max-w-2xl break-all font-mono text-xs text-slate-600">
            ID solicitado: {deviceId}
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Voltar ao dashboard
            </Link>

            <button
              type="button"
              onClick={loadDevice}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-sky-400"
            >
              <ArrowLeft size={16} />
              Voltar ao dashboard
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {device.model}
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                  device.status,
                )}`}
              >
                {statusLabel(device.status)}
              </span>

              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                {device.standard}
              </span>
            </div>

            <p className="mt-2 break-all text-sm text-slate-400">
              {device.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <Clipboard size={16} />
              Copiar resumo
            </button>

            <button
              type="button"
              onClick={handleRefreshWifi}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Wifi size={16} />
              Atualizar Wi-Fi
            </button>

            <button
              type="button"
              onClick={handleRefreshHosts}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Network size={16} />
              Atualizar hosts
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Geral
            </button>

            <button
              type="button"
              onClick={handleReboot}
              disabled={rebooting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {rebooting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Power size={16} />
              )}
              Reboot
            </button>
          </div>
        </div>
      </header>

      {actionMessage && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <CheckCircle size={18} />
            {actionMessage}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            icon={Server}
            label="Fabricante"
            value={device.manufacturer}
          />

          <InfoCard
            icon={Cpu}
            label="Firmware"
            value={device.softwareVersion}
          />

          <InfoCard icon={Globe} label="IP WAN" value={device.ip} />

          <InfoCard icon={Network} label="PPPoE" value={device.pppoe} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={Router} label="IP LAN" value={device.lanIp} />

          <InfoCard
            icon={HardDrive}
            label="Hardware"
            value={device.hardwareVersion}
          />

          <InfoCard
            icon={Activity}
            label="Uptime"
            value={device.uptimeFormatted}
          />

          <InfoCard
            icon={Shield}
            label="Último contato"
            value={formatDate(device.lastContact)}
          />
        </div>


        <ConnectionRequestCard
          deviceId={device.id}
          info={device.connectionRequest}
          onNotify={notify}
        />
        <ContextualHealthScoreCard device={device} />

        <DeviceOperationalProfileCard deviceId={device.id} />

        <DeviceActiveAlertsCard deviceId={device.id} />

        <DeviceCapabilitiesCard capabilities={device.capabilities} />

        <ParameterExplorerCard deviceId={device.id} />

        <ProvisioningTemplatesCard
          device={device}
          onNotify={notify}
        />

        <DeviceActionsTimeline deviceId={device.id} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Redes Wi-Fi</h2>
                <p className="text-sm text-slate-500">
                  SSID, senha sincronizada, status e edição remota.
                </p>
              </div>

              <Wifi className="text-sky-400" size={22} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {device.wifi.map((network, index) => {
                const busyKey = `${network.standard}-${network.instance}`;

                return (
                  <WifiCard
                    key={`${network.instance || index}-${network.ssid}`}
                    network={network}
                    index={index}
                    onEdit={openWifiEditor}
                    onToggle={handleToggleWifi}
                    onCopy={handleCopyWifi}
                    busy={wifiBusyKey === busyKey}
                  />
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-bold">Resumo operacional</h2>
            <p className="mt-1 text-sm text-slate-500">
              Visão rápida para suporte e NOC.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Hosts conectados</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {device.activeHostCount}
                  <span className="text-sm font-normal text-slate-500">
                    {' '}
                    / {device.hostCount}
                  </span>
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Serial</p>
                <p className="mt-1 break-all text-sm font-semibold text-white">
                  {device.serialNumber}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Product Class</p>
                <p className="mt-1 break-all text-sm font-semibold text-white">
                  {device.productClass}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">OUI</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {device.oui}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-lg font-bold">Dispositivos conectados na LAN</h2>
            <p className="mt-1 text-sm text-slate-500">
              Hosts reportados pelo CPE via TR-069.
            </p>
          </div>

          <div className="overflow-x-auto">
            {device.hosts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Nenhum host LAN foi reportado por este equipamento.
              </div>
            ) : (
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Host</th>
                    <th className="px-4 py-4">IP</th>
                    <th className="px-4 py-4">MAC</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {device.hosts.map((host) => (
                    <HostRow key={`${host.mac}-${host.ip}`} host={host} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-lg font-bold">Parâmetros principais</h2>
            <p className="mt-1 text-sm text-slate-500">
              Campos normalizados do CPE.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-b-2xl bg-slate-800 md:grid-cols-2">
            {device.importantParameters.map((param) => (
              <div key={param.label} className="bg-slate-950 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {param.label}
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-white">
                  {param.value || '-'}
                </p>

                {param.path && (
                  <p className="mt-2 break-all font-mono text-xs text-slate-600">
                    {param.path}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {editingWifi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Editar Wi-Fi</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Alteração enviada como task TR-069.
                </p>
              </div>

              <button
                type="button"
                onClick={closeWifiEditor}
                disabled={savingWifi}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-200">
              <p>
                Instância: <strong>{editingWifi.instance}</strong>
              </p>
              <p>
                Padrão: <strong>{editingWifi.standard}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Nome da rede SSID
                </label>

                <input
                  value={editSsid}
                  onChange={(event) => setEditSsid(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                  placeholder="Nome da rede"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Senha Wi-Fi
                </label>

                <input
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                  placeholder="Mínimo 8 caracteres"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Se deixar vazio, a senha não será alterada.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeWifiEditor}
                disabled={savingWifi}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveWifi}
                disabled={savingWifi}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingWifi ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar alteração
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}