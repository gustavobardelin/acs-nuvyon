// acs-frontend/src/components/device/GuestWifiManagerCard.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceWifiNetwork } from '@/types/devices';

function findWifiByInstance(
  wifi: DeviceWifiNetwork[] | null | undefined,
  instance: string,
): DeviceWifiNetwork | undefined {
  return (wifi || []).find(
    (network) => network.standard === 'TR-181' && network.instance === instance,
  );
}

export function GuestWifiManagerCard({
  deviceId,
  wifi,
  onNotify,
}: {
  deviceId: string;
  wifi: DeviceWifiNetwork[] | null | undefined;
  onNotify?: (message: string) => void;
}) {
  const guest2g = useMemo(() => findWifiByInstance(wifi, '2'), [wifi]);
  const guest5g = useMemo(() => findWifiByInstance(wifi, '4'), [wifi]);

  const [ssid2g, setSsid2g] = useState('');
  const [ssid5g, setSsid5g] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [hideSsid, setHideSsid] = useState(false);
  const [changeIsolation, setChangeIsolation] = useState(false);
  const [isolation, setIsolation] = useState(false);
  const [saving, setSaving] = useState(false);

  const supported = Boolean(guest2g || guest5g);

  useEffect(() => {
    setSsid2g(guest2g?.ssid && guest2g.ssid !== '-' ? guest2g.ssid : '');
    setSsid5g(guest5g?.ssid && guest5g.ssid !== '-' ? guest5g.ssid : '');
    setEnabled(Boolean(guest2g?.enabled || guest5g?.enabled));
  }, [guest2g?.ssid, guest2g?.enabled, guest5g?.ssid, guest5g?.enabled]);

  async function handleSave() {
    if (!supported) {
      alert('Este dispositivo não possui SSID guest/secundário detectado.');
      return;
    }

    if (!ssid2g.trim() && !ssid5g.trim()) {
      alert('Informe pelo menos um SSID guest.');
      return;
    }

    if (password.trim() && password.trim().length < 8) {
      alert('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }

    setSaving(true);

    try {
      await api.post(`/devices/${encodeURIComponent(deviceId)}/guest-wifi`, {
        ssid2g: ssid2g.trim() || undefined,
        ssid5g: ssid5g.trim() || undefined,
        password: password.trim() || undefined,
        enabled,
        hideSsid,
        isolation: changeIsolation ? isolation : undefined,
      });

      setPassword('');
      onNotify?.('Configuração Guest Wi-Fi enviada via Connection Request.');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao configurar Guest Wi-Fi.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-400">
            <Wifi size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Guest Wi-Fi
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Gerenciador de SSID secundário
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure a rede guest 2.4GHz e 5GHz sem mexer na VLAN WAN/PPPoE.
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            supported
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {supported ? 'SSID secundário detectado' : 'Não suportado'}
        </span>
      </div>

      {!supported ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Nenhum SSID secundário TR-181 foi detectado neste CPE.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                SSID Guest 2.4GHz
              </label>
              <input
                value={ssid2g}
                onChange={(event) => setSsid2g(event.target.value)}
                maxLength={32}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                placeholder="NUVYON_WIFI"
              />
              <p className="mt-1 text-xs text-slate-600">
                Atual: {guest2g?.ssid || '-'}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                SSID Guest 5GHz
              </label>
              <input
                value={ssid5g}
                onChange={(event) => setSsid5g(event.target.value)}
                maxLength={32}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                placeholder="NUVYON_WIFI_5G"
              />
              <p className="mt-1 text-xs text-slate-600">
                Atual: {guest5g?.ssid || '-'}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Nova senha Guest
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              maxLength={63}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Deixe vazio para não alterar"
            />
            <p className="mt-1 text-xs text-slate-600">
              A senha atual não é retornada por esse firmware TP-Link. Só será alterada se você preencher este campo.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setEnabled((current) => !current)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                enabled
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/70'
              }`}
            >
              <div>
                <p className="font-semibold text-white">Ativar Guest</p>
                <p className="text-xs text-slate-500">
                  Liga/desliga SSID 2 e 4
                </p>
              </div>
              <span className="text-sm font-bold text-slate-300">
                {enabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHideSsid((current) => !current)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                hideSsid
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-slate-800 bg-slate-900/70'
              }`}
            >
              <div>
                <p className="font-semibold text-white">Ocultar SSID</p>
                <p className="text-xs text-slate-500">
                  Controla broadcast
                </p>
              </div>
              {hideSsid ? (
                <EyeOff className="text-amber-300" size={18} />
              ) : (
                <Eye className="text-slate-400" size={18} />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setChangeIsolation((current) => !current);
                if (!changeIsolation) setIsolation(true);
              }}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                changeIsolation
                  ? 'border-sky-500/30 bg-sky-500/10'
                  : 'border-slate-800 bg-slate-900/70'
              }`}
            >
              <div>
                <p className="font-semibold text-white">Alterar isolamento</p>
                <p className="text-xs text-slate-500">
                  Opcional por rádio
                </p>
              </div>
              <ShieldAlert
                className={changeIsolation ? 'text-sky-300' : 'text-slate-400'}
                size={18}
              />
            </button>
          </div>

          {changeIsolation && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="shrink-0 text-amber-300" size={20} />
                <div>
                  <p className="font-semibold text-amber-200">
                    Atenção: isolamento parece ser por rádio
                  </p>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Neste TP-Link, o parâmetro detectado é Device.WiFi.Radio.*.IsolationEnable.
                    Isso pode afetar clientes da rede principal também, não apenas o Guest.
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsolation((current) => !current)}
                    className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200"
                  >
                    Isolamento será aplicado como: {isolation ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Aplicar Guest Wi-Fi
          </button>
        </div>
      )}
    </div>
  );
}
