'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  FileSliders,
  GitCompare,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceSummary } from '@/types/devices';

type DeviceGroup = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  filters?: Record<string, any>;
};

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

type DeviceComplianceIssue = {
  path: string;
  expected: string;
  actual: string;
  type: string;
  status: ComplianceStatus;
  reason: string;
};

type DeviceComplianceResult = {
  device: DeviceSummary;
  total: number;
  ok: number;
  drift: number;
  missing: number;
  unreadable: number;
  compliancePercent: number;
  status: 'compliant' | 'attention' | 'failed';
  issues: DeviceComplianceIssue[];
  error?: string;
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

function preview(value: string) {
  if (!value) return '-';
  if (value.length > 90) return `${value.slice(0, 90)}...`;
  return value;
}

function resultStyle(status: DeviceComplianceResult['status']) {
  if (status === 'compliant') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'attention') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function resultLabel(status: DeviceComplianceResult['status']) {
  if (status === 'compliant') return 'Conforme';
  if (status === 'attention') return 'Atenção';
  return 'Fora do padrão';
}

function issueStyle(status: ComplianceStatus) {
  if (status === 'ok') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'drift') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'missing') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function issueLabel(status: ComplianceStatus) {
  if (status === 'ok') return 'OK';
  if (status === 'drift') return 'Diferente';
  if (status === 'missing') return 'Ausente';
  return 'Sem leitura';
}

function issueIcon(status: ComplianceStatus) {
  if (status === 'ok') return <CheckCircle size={14} />;
  if (status === 'drift') return <XCircle size={14} />;
  if (status === 'missing') return <AlertTriangle size={14} />;
  return <ShieldCheck size={14} />;
}

function extractDevices(payload: any): DeviceSummary[] {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.devices)) return payload.devices;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function extractParameters(payload: any): DeviceParameter[] {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.parameters)) return payload.parameters;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

export default function CompliancePage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DeviceComplianceResult[]>([]);
  const [q, setQ] = useState('');
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const selectedGroup = useMemo(() => {
    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const summary = useMemo(() => {
    return {
      total: results.length,
      compliant: results.filter((item) => item.status === 'compliant').length,
      attention: results.filter((item) => item.status === 'attention').length,
      failed: results.filter((item) => item.status === 'failed').length,
      drift: results.reduce((sum, item) => sum + item.drift, 0),
      missing: results.reduce((sum, item) => sum + item.missing, 0),
      unreadable: results.reduce((sum, item) => sum + item.unreadable, 0),
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return results;

    return results.filter((result) => {
      const device = result.device as any;

      const haystack = [
        result.device.id,
        device.serialNumber,
        device.model,
        device.productClass,
        device.manufacturer,
        device.ip,
        result.status,
        result.error,
        result.issues.map((issue) => `${issue.path} ${issue.status} ${issue.reason}`).join(' '),
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [results, q]);

  async function loadBaseData() {
    setLoading(true);

    try {
      const [groupsResponse, templatesResponse] = await Promise.all([
        api.get<DeviceGroup[]>('/device-groups'),
        api.get<ProvisioningTemplate[]>('/provisioning-templates'),
      ]);

      const nextGroups = groupsResponse.data || [];
      const nextTemplates = (templatesResponse.data || []).filter(
        (template) => Array.isArray(template.parameters) && template.parameters.length > 0,
      );

      setGroups(nextGroups);
      setTemplates(nextTemplates);

      if (!selectedGroupId && nextGroups[0]) {
        setSelectedGroupId(nextGroups[0].id);
      }

      if (!selectedTemplateId && nextTemplates[0]) {
        setSelectedTemplateId(nextTemplates[0].id);
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar grupos e templates.',
      );
    } finally {
      setLoading(false);
    }
  }

  function compareDeviceWithTemplate(
    device: DeviceSummary,
    template: ProvisioningTemplate,
    parameters: DeviceParameter[],
  ): DeviceComplianceResult {
    const parameterMap = new Map<string, DeviceParameter>();

    for (const parameter of parameters) {
      if (!parameter?.path) continue;
      parameterMap.set(parameter.path, parameter);
    }

    const rows = template.parameters.map<DeviceComplianceIssue>((parameter) => {
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

    const total = rows.length;
    const ok = rows.filter((row) => row.status === 'ok').length;
    const drift = rows.filter((row) => row.status === 'drift').length;
    const missing = rows.filter((row) => row.status === 'missing').length;
    const unreadable = rows.filter((row) => row.status === 'unreadable').length;
    const comparable = total - unreadable;
    const compliancePercent = comparable > 0 ? Math.round((ok / comparable) * 100) : 0;

    let status: DeviceComplianceResult['status'] = 'compliant';

    if (drift > 0 || missing > 0) {
      status = 'failed';
    } else if (unreadable > 0) {
      status = 'attention';
    }

    return {
      device,
      total,
      ok,
      drift,
      missing,
      unreadable,
      compliancePercent,
      status,
      issues: rows.filter((row) => row.status !== 'ok'),
    };
  }

  async function runCompliance() {
    if (!selectedGroupId) {
      alert('Selecione um grupo.');
      return;
    }

    if (!selectedTemplate) {
      alert('Selecione um template.');
      return;
    }

    const confirmed = window.confirm(
      `Rodar compliance em lote?\n\nGrupo: ${selectedGroup?.name || selectedGroupId}\nTemplate: ${selectedTemplate.name}`,
    );

    if (!confirmed) return;

    setRunning(true);
    setResults([]);
    setExpandedDeviceId(null);

    try {
      const devicesResponse = await api.get(`/device-groups/${encodeURIComponent(selectedGroupId)}/devices`);
      const devices = extractDevices(devicesResponse.data);

      if (devices.length === 0) {
        alert('Nenhum CPE encontrado neste grupo.');
        return;
      }

      const nextResults: DeviceComplianceResult[] = [];

      for (const device of devices) {
        try {
          const parametersResponse = await api.get(
            `/device-parameters/${encodeURIComponent(device.id)}`,
            {
              params: {
                limit: 10000,
              },
            },
          );

          const parameters = extractParameters(parametersResponse.data);
          const result = compareDeviceWithTemplate(device, selectedTemplate, parameters);

          nextResults.push(result);
          setResults([...nextResults]);
        } catch (err: any) {
          nextResults.push({
            device,
            total: selectedTemplate.parameters.length,
            ok: 0,
            drift: 0,
            missing: selectedTemplate.parameters.length,
            unreadable: 0,
            compliancePercent: 0,
            status: 'failed',
            issues: [],
            error:
              err?.response?.data?.message ||
              err?.message ||
              'Falha ao consultar parâmetros do CPE.',
          });

          setResults([...nextResults]);
        }
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao executar compliance em lote.',
      );
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadBaseData();
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <ShieldCheck size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Compliance em Lote
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Verifique grupos inteiros contra templates esperados e encontre CPEs fora do padrão operacional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/templates"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <FileSliders size={17} />
              Templates
            </a>

            <a
              href="/groups"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <Users size={17} />
              Grupos
            </a>

            <button
              type="button"
              onClick={loadBaseData}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div className="mb-5 flex items-center gap-2 text-emerald-300">
            <GitCompare size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Executar verificação
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={16} />
              Carregando grupos e templates...
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_180px]">
              <select
                value={selectedGroupId}
                onChange={(event) => {
                  setSelectedGroupId(event.target.value);
                  setResults([]);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
              >
                <option value="">Selecione um grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedTemplateId}
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value);
                  setResults([]);
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

              <button
                type="button"
                onClick={runCompliance}
                disabled={running || !selectedGroupId || !selectedTemplateId}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {running ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Rodar
              </button>
            </div>
          )}

          {selectedGroup && selectedTemplate && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Grupo selecionado
                </p>
                <p className="mt-2 font-semibold text-white">{selectedGroup.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedGroup.description || 'Sem descrição.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Template selecionado
                </p>
                <p className="mt-2 font-semibold text-white">{selectedTemplate.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTemplate.parameters?.length || 0} parâmetro(s) ·{' '}
                  {selectedTemplate.description || 'Sem descrição.'}
                </p>
              </div>
            </div>
          )}
        </section>

        {results.length > 0 && (
          <>
            <section className="mb-8 grid gap-5 md:grid-cols-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-500">Verificados</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.total}</p>
              </div>

              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="text-sm text-emerald-200/70">Conformes</p>
                <p className="mt-2 text-3xl font-bold text-emerald-200">{summary.compliant}</p>
              </div>

              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="text-sm text-amber-200/70">Atenção</p>
                <p className="mt-2 text-3xl font-bold text-amber-200">{summary.attention}</p>
              </div>

              <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="text-sm text-red-200/70">Fora padrão</p>
                <p className="mt-2 text-3xl font-bold text-red-200">{summary.failed}</p>
              </div>

              <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="text-sm text-red-200/70">Drifts</p>
                <p className="mt-2 text-3xl font-bold text-red-200">{summary.drift}</p>
              </div>

              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="text-sm text-amber-200/70">Ausentes</p>
                <p className="mt-2 text-3xl font-bold text-amber-200">{summary.missing}</p>
              </div>
            </section>

            <div className="mb-6 flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
              <Search className="mr-3 text-slate-500" size={18} />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
                placeholder="Buscar por CPE, serial, modelo, IP, path ou status..."
              />
            </div>

            <section className="grid gap-4">
              {filteredResults.map((result) => {
                const device = result.device as any;
                const expanded = expandedDeviceId === result.device.id;

                return (
                  <div
                    key={result.device.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${resultStyle(
                              result.status,
                            )}`}
                          >
                            {resultLabel(result.status)}
                          </span>

                          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                            Compliance {result.compliancePercent}%
                          </span>

                          {result.error && (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                              Erro de leitura
                            </span>
                          )}
                        </div>

                        <h2 className="break-all font-mono text-sm font-bold text-white">
                          {result.device.id}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                          {device.manufacturer || '-'} · {device.model || '-'} · SN:{' '}
                          {device.serialNumber || '-'} · WAN: {device.ip || '-'}
                        </p>

                        {result.error && (
                          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                            {result.error}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 xl:w-[620px]">
                        <div className="grid gap-3 text-sm sm:grid-cols-5">
                          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="mt-1 text-xl font-bold text-white">{result.total}</p>
                          </div>

                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <p className="text-xs text-emerald-200/70">OK</p>
                            <p className="mt-1 text-xl font-bold text-emerald-200">{result.ok}</p>
                          </div>

                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                            <p className="text-xs text-red-200/70">Drift</p>
                            <p className="mt-1 text-xl font-bold text-red-200">{result.drift}</p>
                          </div>

                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-200/70">Ausente</p>
                            <p className="mt-1 text-xl font-bold text-amber-200">{result.missing}</p>
                          </div>

                          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                            <p className="text-xs text-slate-500">Sem leitura</p>
                            <p className="mt-1 text-xl font-bold text-slate-300">{result.unreadable}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDeviceId(expanded ? null : result.device.id)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                          >
                            {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                          </button>

                          <a
                            href={`/devices/${encodeURIComponent(result.device.id)}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                          >
                            <ExternalLink size={15} />
                            Abrir CPE
                          </a>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Divergências encontradas
                        </p>

                        {result.issues.length === 0 ? (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                            Nenhuma divergência comparável encontrada neste CPE.
                          </div>
                        ) : (
                          <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-800">
                            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                              <thead className="sticky top-0 z-10 bg-slate-950">
                                <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.12em] text-slate-500">
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Path</th>
                                  <th className="px-4 py-3">Esperado</th>
                                  <th className="px-4 py-3">Atual</th>
                                  <th className="px-4 py-3">Motivo</th>
                                </tr>
                              </thead>

                              <tbody>
                                {result.issues.map((issue) => (
                                  <tr
                                    key={`${result.device.id}-${issue.path}`}
                                    className="border-b border-slate-900 transition hover:bg-slate-900/60"
                                  >
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${issueStyle(
                                          issue.status,
                                        )}`}
                                      >
                                        {issueIcon(issue.status)}
                                        {issueLabel(issue.status)}
                                      </span>
                                    </td>

                                    <td className="max-w-[340px] px-4 py-3">
                                      <p className="break-all font-mono text-xs text-slate-300">
                                        {issue.path}
                                      </p>
                                    </td>

                                    <td className="max-w-[220px] px-4 py-3">
                                      <p className="break-all font-mono text-xs text-slate-400">
                                        {isSensitivePath(issue.path)
                                          ? issue.expected
                                            ? '********'
                                            : '-'
                                          : preview(issue.expected)}
                                      </p>
                                    </td>

                                    <td className="max-w-[220px] px-4 py-3">
                                      <p className="break-all font-mono text-xs text-slate-400">
                                        {isSensitivePath(issue.path)
                                          ? issue.actual
                                            ? '********'
                                            : '-'
                                          : preview(issue.actual)}
                                      </p>
                                    </td>

                                    <td className="max-w-[320px] px-4 py-3 text-xs text-slate-500">
                                      {issue.reason}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
