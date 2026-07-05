'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileSliders,
  GitCompare,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

type TemplateParameter = {
  path: string;
  value: string | number | boolean;
  type?: string;
};

type ProvisioningTemplate = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  vendor?: string | null;
  model?: string | null;
  productClass?: string | null;
  parameters: TemplateParameter[];
};

type DeviceParameter = {
  path: string;
  value: string;
  type?: string;
  writable?: boolean;
  timestamp?: string | null;
};

type ComplianceStatus = 'ok' | 'drift' | 'missing' | 'unreadable';

type ComplianceRow = {
  path: string;
  expected: string;
  actual: string;
  type: string;
  status: ComplianceStatus;
  reason: string;
};

function isSensitivePath(path: string) {
  const normalized = path.toLowerCase();

  return [
    'password',
    'keypassphrase',
    'presharedkey',
    'radiussecret',
    'secret',
  ].some((term) => normalized.includes(term));
}

function normalizeBoolean(value: string) {
  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'enabled', 'enable', 'yes', 'sim'].includes(normalized)) {
    return 'true';
  }

  if (['0', 'false', 'disabled', 'disable', 'no', 'não', 'nao'].includes(normalized)) {
    return 'false';
  }

  return normalized;
}

function normalizeValue(value: unknown, type?: string) {
  const raw = String(value ?? '').trim();

  if (!raw) return '';

  const normalizedType = String(type || '').toLowerCase();

  if (normalizedType.includes('boolean')) {
    return normalizeBoolean(raw);
  }

  if (
    normalizedType.includes('int') ||
    normalizedType.includes('unsigned') ||
    normalizedType.includes('long')
  ) {
    const numberValue = Number(raw);

    if (!Number.isNaN(numberValue)) {
      return String(numberValue);
    }
  }

  return raw;
}

function compareValue(expected: unknown, actual: unknown, type?: string) {
  return normalizeValue(expected, type) === normalizeValue(actual, type);
}

function statusStyle(status: ComplianceStatus) {
  if (status === 'ok') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'drift') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'missing') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function statusLabel(status: ComplianceStatus) {
  if (status === 'ok') return 'OK';
  if (status === 'drift') return 'Diferente';
  if (status === 'missing') return 'Ausente';
  return 'Sem leitura';
}

function statusIcon(status: ComplianceStatus) {
  if (status === 'ok') return <CheckCircle size={14} />;
  if (status === 'drift') return <XCircle size={14} />;
  if (status === 'missing') return <AlertTriangle size={14} />;
  return <ShieldCheck size={14} />;
}

function preview(value: string) {
  if (!value) return '-';
  if (value.length > 90) return `${value.slice(0, 90)}...`;
  return value;
}

export function DeviceTemplateComplianceCard({ deviceId }: { deviceId: string }) {
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loadedTemplates, setLoadedTemplates] = useState(false);
  const [q, setQ] = useState('');

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      ok: rows.filter((row) => row.status === 'ok').length,
      drift: rows.filter((row) => row.status === 'drift').length,
      missing: rows.filter((row) => row.status === 'missing').length,
      unreadable: rows.filter((row) => row.status === 'unreadable').length,
    };
  }, [rows]);

  const compliancePercent = useMemo(() => {
    const comparable = summary.total - summary.unreadable;

    if (comparable <= 0) return 0;

    return Math.round((summary.ok / comparable) * 100);
  }, [summary]);

  const filteredRows = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.path,
        row.expected,
        row.actual,
        row.status,
        row.reason,
        row.type,
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [rows, q]);

  async function loadTemplates() {
    setLoadingTemplates(true);

    try {
      const response = await api.get<ProvisioningTemplate[]>('/provisioning-templates');

      const validTemplates = (response.data || []).filter(
        (template) => Array.isArray(template.parameters) && template.parameters.length > 0,
      );

      setTemplates(validTemplates);

      if (!selectedTemplateId && validTemplates[0]) {
        setSelectedTemplateId(validTemplates[0].id);
      }

      setLoadedTemplates(true);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar templates.',
      );
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function checkCompliance() {
    if (!selectedTemplate) {
      alert('Selecione um template para comparar.');
      return;
    }

    setChecking(true);

    try {
      const response = await api.get<any>(
        `/device-parameters/${encodeURIComponent(deviceId)}`,
        {
          params: {
            limit: 10000,
          },
        },
      );

      const parameterList: DeviceParameter[] = Array.isArray(response.data)
        ? response.data
        : response.data?.parameters || response.data?.items || [];

      const parameterMap = new Map<string, DeviceParameter>();

      for (const parameter of parameterList) {
        if (!parameter?.path) continue;

        parameterMap.set(parameter.path, parameter);
      }

      const nextRows: ComplianceRow[] = selectedTemplate.parameters.map((parameter) => {
        const path = parameter.path;
        const expected = String(parameter.value ?? '');
        const type = parameter.type || 'xsd:string';
        const current = parameterMap.get(path);

        if (!current) {
          return {
            path,
            expected,
            actual: '',
            type,
            status: 'missing',
            reason: 'Path do template não foi encontrado nos parâmetros atuais do CPE.',
          };
        }

        const actual = String(current.value ?? '');

        if (isSensitivePath(path) && !actual) {
          return {
            path,
            expected,
            actual,
            type,
            status: 'unreadable',
            reason:
              'Parâmetro sensível. O CPE pode aceitar escrita, mas não retornar leitura.',
          };
        }

        if (compareValue(expected, actual, type)) {
          return {
            path,
            expected,
            actual,
            type,
            status: 'ok',
            reason: 'Valor atual bate com o template.',
          };
        }

        return {
          path,
          expected,
          actual,
          type,
          status: 'drift',
          reason: 'Valor atual está diferente do valor esperado no template.',
        };
      });

      setRows(nextRows);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao verificar compliance do template.',
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <ShieldCheck size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Template Compliance
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Verificação de conformidade do CPE
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Compara os parâmetros atuais do CPE com um template e detecta diferenças,
            paths ausentes e parâmetros sem leitura.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadTemplates}
            disabled={loadingTemplates}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingTemplates ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Carregar templates
          </button>

          <button
            type="button"
            onClick={checkCompliance}
            disabled={checking || !selectedTemplateId}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <GitCompare size={15} />
            )}
            Verificar
          </button>
        </div>
      </div>

      {!loadedTemplates ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
          Clique em <strong className="text-slate-300">Carregar templates</strong> para iniciar a verificação.
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          Nenhum template com parâmetros foi encontrado.
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_180px]">
            <select
              value={selectedTemplateId}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
                setRows([]);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
            >
              <option value="">Selecione um template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.parameters?.length || 0} parâmetro(s)
                </option>
              ))}
            </select>

            <a
              href="/templates"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <FileSliders size={15} />
              Templates
            </a>
          </div>

          {selectedTemplate && (
            <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-white">{selectedTemplate.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTemplate.description || 'Sem descrição.'}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Status: {selectedTemplate.status || '-'} · Vendor:{' '}
                {selectedTemplate.vendor || '-'} · Modelo:{' '}
                {selectedTemplate.model || '-'} · Product Class:{' '}
                {selectedTemplate.productClass || '-'}
              </p>
            </div>
          )}
        </>
      )}

      {rows.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-semibold text-white">
                Resultado da conformidade
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Compliance calculado: {compliancePercent}% dos parâmetros comparáveis.
              </p>
            </div>

            <div className="grid gap-2 text-center text-sm sm:grid-cols-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-bold text-white">{summary.total}</p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-xs text-emerald-200/70">OK</p>
                <p className="font-bold text-emerald-200">{summary.ok}</p>
              </div>

              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-xs text-red-200/70">Diferente</p>
                <p className="font-bold text-red-200">{summary.drift}</p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-200/70">Ausente</p>
                <p className="font-bold text-amber-200">{summary.missing}</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                <p className="text-xs text-slate-500">Sem leitura</p>
                <p className="font-bold text-slate-300">{summary.unreadable}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-4">
            <Search className="mr-3 text-slate-500" size={18} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Filtrar por path, valor, status ou motivo..."
            />
          </div>

          <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950">
                <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Esperado</th>
                  <th className="px-4 py-3">Atual</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.path}
                    className="border-b border-slate-900 transition hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                          row.status,
                        )}`}
                      >
                        {statusIcon(row.status)}
                        {statusLabel(row.status)}
                      </span>
                    </td>

                    <td className="max-w-[340px] px-4 py-3">
                      <p className="break-all font-mono text-xs text-slate-300">
                        {row.path}
                      </p>
                    </td>

                    <td className="max-w-[220px] px-4 py-3">
                      <p className="break-all font-mono text-xs text-slate-400">
                        {isSensitivePath(row.path)
                          ? row.expected
                            ? '********'
                            : '-'
                          : preview(row.expected)}
                      </p>
                    </td>

                    <td className="max-w-[220px] px-4 py-3">
                      <p className="break-all font-mono text-xs text-slate-400">
                        {isSensitivePath(row.path)
                          ? row.actual
                            ? '********'
                            : '-'
                          : preview(row.actual)}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.type}
                    </td>

                    <td className="max-w-[280px] px-4 py-3 text-xs text-slate-500">
                      {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(summary.drift > 0 || summary.missing > 0) && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Este CPE possui divergência com o template. Para corrigir, aplique o template pelo card de Provisioning Templates ou pela página de Templates.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
