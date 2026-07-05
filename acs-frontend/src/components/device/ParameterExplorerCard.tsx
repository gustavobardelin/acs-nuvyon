'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Database,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceParameterExplorerItem,
  DeviceParameterExplorerResponse,
} from '@/types/device-parameters';

function formatDate(value: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

function valuePreview(value: string) {
  if (!value) return '-';

  if (value.length > 120) return `${value.slice(0, 120)}...`;

  return value;
}

export function ParameterExplorerCard({ deviceId }: { deviceId: string }) {
  const [parameters, setParameters] = useState<DeviceParameterExplorerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [q, setQ] = useState('');
  const [writable, setWritable] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const writableCount = useMemo(() => {
    return parameters.filter((parameter) => parameter.writable).length;
  }, [parameters]);

  async function loadParameters(customQ?: string) {
    setLoading(true);

    try {
      const response = await api.get<DeviceParameterExplorerResponse>(
        `/device-parameters/${encodeURIComponent(deviceId)}`,
        {
          params: {
            q: customQ ?? q,
            writable: writable || undefined,
            limit: 800,
          },
        },
      );

      setParameters(response.data.parameters || []);
      setTotal(response.data.total || 0);
      setFiltered(response.data.filtered || 0);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar parâmetros.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyPath(path: string) {
    await navigator.clipboard.writeText(path);
  }

  async function refreshObject() {
    const objectName = window.prompt(
      'Objeto para atualizar:',
      q.trim() || 'Device',
    );

    if (objectName === null) return;

    setActionLoading('refresh');

    try {
      await api.post(
        `/device-parameters/${encodeURIComponent(deviceId)}/refresh`,
        {
          objectName: objectName.trim() || 'Device',
        },
      );

      alert('Refresh enviado via ACS. Aguarde o CPE informar e atualize a lista.');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao enviar refresh.',
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function editParameter(parameter: DeviceParameterExplorerItem) {
    if (!parameter.writable) {
      alert('Este parâmetro não é writable.');
      return;
    }

    const newValue = window.prompt(
      `Novo valor para:\n${parameter.path}`,
      parameter.value,
    );

    if (newValue === null) return;

    const type = window.prompt('Tipo XSD:', parameter.type || 'xsd:string');

    if (type === null) return;

    setActionLoading(parameter.path);

    try {
      await api.post(`/device-parameters/${encodeURIComponent(deviceId)}/set`, {
        path: parameter.path,
        value: newValue,
        type: type || parameter.type || 'xsd:string',
      });

      alert('Parâmetro enviado via ACS.');
      await loadParameters();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao alterar parâmetro.',
      );
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadParameters('');
  }, [deviceId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-300">
            <Database size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Parameter Explorer
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Explorador técnico de parâmetros
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Pesquise parâmetros TR-069/TR-181, copie paths, atualize objetos e altere parâmetros writable.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshObject}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {actionLoading === 'refresh' ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh objeto
          </button>

          <button
            type="button"
            onClick={() => loadParameters()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
            Atualizar lista
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_220px_160px]">
        <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-900/70 px-4">
          <Search className="mr-3 text-slate-500" size={18} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') loadParameters();
            }}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            placeholder="Buscar: WiFi, SSID, PPP, WAN, PeriodicInform, KeyPassphrase..."
          />
        </div>

        <select
          value={writable}
          onChange={(event) => setWritable(event.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-white outline-none"
        >
          <option value="">Todos</option>
          <option value="true">Somente writable</option>
          <option value="false">Somente leitura</option>
        </select>

        <button
          type="button"
          onClick={() => loadParameters()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-4 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <Search size={17} />
          Buscar
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500">Total no CPE</p>
          <p className="mt-1 text-2xl font-bold text-white">{total}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs text-cyan-200/70">Resultado</p>
          <p className="mt-1 text-2xl font-bold text-cyan-200">{filtered}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-200/70">Writable na tela</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">
            {writableCount}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando parâmetros...
        </div>
      ) : parameters.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
          Nenhum parâmetro encontrado.
        </div>
      ) : (
        <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950">
              <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Writable</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {parameters.map((parameter) => (
                <tr
                  key={parameter.path}
                  className="border-b border-slate-900 transition hover:bg-slate-900/60"
                >
                  <td className="max-w-[420px] px-4 py-3">
                    <p className="break-all font-mono text-xs text-slate-300">
                      {parameter.path}
                    </p>
                  </td>

                  <td className="max-w-[260px] px-4 py-3">
                    <p className="break-all font-mono text-xs text-slate-400">
                      {valuePreview(parameter.value)}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400">
                      {parameter.type || '-'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {parameter.writable ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                        <ShieldCheck size={12} />
                        Sim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-400">
                        <ShieldX size={12} />
                        Não
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(parameter.timestamp)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyPath(parameter.path)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                      >
                        <Copy size={13} />
                        Copiar
                      </button>

                      {parameter.writable && (
                        <button
                          type="button"
                          onClick={() => editParameter(parameter)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {actionLoading === parameter.path ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : (
                            <Edit3 size={13} />
                          )}
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100/80">
        Cuidado: alterar parâmetros writable pode derrubar Wi-Fi, WAN, PPPoE ou TR-069. Use primeiro em laboratório ou em paths já conhecidos.
      </div>
    </div>
  );
}
