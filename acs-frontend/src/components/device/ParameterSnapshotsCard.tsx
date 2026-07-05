'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  FileSliders,
  GitCompare,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DeviceParameterDiffResponse,
  DeviceParameterSnapshot,
} from '@/types/device-parameter-snapshots';

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

function changeStyle(type: string) {
  if (type === 'added') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (type === 'removed') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function changeLabel(type: string) {
  if (type === 'added') return 'Adicionado';
  if (type === 'removed') return 'Removido';
  return 'Alterado';
}

function preview(value: string | undefined | null) {
  if (!value) return '-';
  if (value.length > 90) return `${value.slice(0, 90)}...`;
  return value;
}

function isSensitiveParameter(path: string) {
  const normalized = path.toLowerCase();

  return [
    'password',
    'keypassphrase',
    'presharedkey',
    'radiussecret',
    'secret',
  ].some((term) => normalized.includes(term));
}

export function ParameterSnapshotsCard({ deviceId }: { deviceId: string }) {
  const [snapshots, setSnapshots] = useState<DeviceParameterSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [diff, setDiff] = useState<DeviceParameterDiffResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [q, setQ] = useState('');

  const filteredChanges = useMemo(() => {
    if (!diff) return [];

    const search = q.trim().toLowerCase();

    if (!search) return diff.changes;

    return diff.changes.filter((change) => {
      const haystack = [
        change.path,
        change.changeType,
        change.before?.value,
        change.after?.value,
        change.before?.type,
        change.after?.type,
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(search);
    });
  }, [diff, q]);

  async function loadSnapshots() {
    setLoading(true);

    try {
      const response = await api.get<DeviceParameterSnapshot[]>(
        '/device-parameter-snapshots',
        {
          params: { deviceId },
        },
      );

      setSnapshots(response.data || []);

      if (!baseId && response.data?.[1]) setBaseId(response.data[1].id);
      if (!targetId && response.data?.[0]) setTargetId(response.data[0].id);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar snapshots.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createSnapshot() {
    const name = window.prompt(
      'Nome do snapshot:',
      `Snapshot ${new Date().toLocaleString('pt-BR')}`,
    );

    if (name === null) return;

    const description = window.prompt(
      'Descrição:',
      'Snapshot manual criado pelo operador.',
    );

    if (description === null) return;

    const filter = window.prompt(
      'Filtro opcional de parâmetros. Deixe vazio para todos:',
      '',
    );

    if (filter === null) return;

    setCreating(true);

    try {
      await api.post(
        `/device-parameter-snapshots/${encodeURIComponent(deviceId)}`,
        {
          name,
          description,
          q: filter,
        },
      );

      await loadSnapshots();
      setDiff(null);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao criar snapshot.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function compareSnapshots() {
    if (!baseId || !targetId) {
      alert('Selecione dois snapshots para comparar.');
      return;
    }

    if (baseId === targetId) {
      alert('Selecione snapshots diferentes.');
      return;
    }

    setDiffLoading(true);

    try {
      const response = await api.get<DeviceParameterDiffResponse>(
        `/device-parameter-snapshots/${encodeURIComponent(
          baseId,
        )}/diff/${encodeURIComponent(targetId)}`,
      );

      setDiff(response.data);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao comparar snapshots.',
      );
    } finally {
      setDiffLoading(false);
    }
  }

  async function removeSnapshot(snapshot: DeviceParameterSnapshot) {
    const confirmDelete = window.confirm(
      `Excluir snapshot "${snapshot.name}"?`,
    );

    if (!confirmDelete) return;

    try {
      await api.delete(
        `/device-parameter-snapshots/${encodeURIComponent(snapshot.id)}`,
      );

      if (baseId === snapshot.id) setBaseId('');
      if (targetId === snapshot.id) setTargetId('');
      setDiff(null);
      await loadSnapshots();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao excluir snapshot.',
      );
    }
  }

  async function createTemplateFromDiff() {
    if (!diff) {
      alert('Compare dois snapshots antes de criar um template.');
      return;
    }

    const candidateChanges = diff.changes.filter((change) => {
      if (!change.after) return false;
      if (change.changeType === 'removed') return false;

      const changedValue =
        change.changeType === 'added' ||
        change.changedFields.includes('value') ||
        change.changedFields.includes('writable') ||
        change.changedFields.includes('type');

      if (!changedValue) return false;

      return !isSensitiveParameter(change.path);
    });

    const sensitiveChanges = diff.changes.filter((change) =>
      isSensitiveParameter(change.path),
    );

    if (candidateChanges.length === 0) {
      alert(
        sensitiveChanges.length > 0
          ? 'O diff só possui parâmetros sensíveis ou removidos. Não vou criar template automático com senha/segredo.'
          : 'Nenhuma alteração aproveitável para template foi encontrada.',
      );
      return;
    }

    const name = window.prompt(
      'Nome do novo template:',
      `Template gerado do diff - ${new Date().toLocaleString('pt-BR')}`,
    );

    if (name === null) return;

    const description = window.prompt(
      'Descrição do template:',
      `Gerado automaticamente a partir do diff ${diff.baseSnapshot.name} → ${diff.targetSnapshot.name}.`,
    );

    if (description === null) return;

    const tagsText = window.prompt(
      'Tags separadas por vírgula:',
      'diff, gerado-automaticamente',
    );

    if (tagsText === null) return;

    const confirmed = window.confirm(
      `Criar template com ${candidateChanges.length} parâmetro(s)?\n\n` +
        `Parâmetros sensíveis ignorados: ${sensitiveChanges.length}\n\n` +
        'Revise o template depois de criar antes de aplicar em lote.',
    );

    if (!confirmed) return;

    try {
      await api.post('/provisioning-templates', {
        name,
        description,
        vendor: null,
        model: null,
        productClass: null,
        status: 'active',
        tags: tagsText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        parameters: candidateChanges.map((change) => ({
          path: change.path,
          value: change.after?.value ?? '',
          type: change.after?.type || 'xsd:string',
        })),
      });

      alert('Template criado com sucesso a partir do diff.');
      window.location.href = '/templates';
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao criar template a partir do diff.',
      );
    }
  }

  useEffect(() => {
    loadSnapshots();
  }, [deviceId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-fuchsia-300">
            <Camera size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Parameter Snapshots
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Snapshots e comparação de parâmetros
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Salve estados dos parâmetros do CPE e compare antes/depois de templates, refresh ou alterações manuais.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createSnapshot}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-300 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
          >
            {creating ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            Novo snapshot
          </button>

          <button
            type="button"
            onClick={loadSnapshots}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando snapshots...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
          Nenhum snapshot criado para este CPE.
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-white">{snapshot.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {snapshot.description || 'Sem descrição.'}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      {snapshot.parameterCount} parâmetros · {formatDate(snapshot.createdAt)} · {snapshot.createdByEmail || '-'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSnapshot(snapshot)}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-4 flex items-center gap-2 text-fuchsia-300">
              <GitCompare size={17} />
              <p className="font-semibold">Comparar snapshots</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
              <select
                value={baseId}
                onChange={(event) => setBaseId(event.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="">Snapshot base</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name} · {formatDate(snapshot.createdAt)}
                  </option>
                ))}
              </select>

              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="">Snapshot alvo</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name} · {formatDate(snapshot.createdAt)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={compareSnapshots}
                disabled={diffLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-fuchsia-300 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
              >
                {diffLoading ? <Loader2 className="animate-spin" size={15} /> : <GitCompare size={15} />}
                Comparar
              </button>
            </div>
          </div>
        </>
      )}

      {diff && (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-white">Resultado do diff</p>
              <p className="mt-1 text-sm text-slate-500">
                {diff.baseSnapshot.name} → {diff.targetSnapshot.name}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="grid gap-2 text-center text-sm md:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-bold text-white">{diff.summary.totalChanges}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs text-emerald-200/70">Add</p>
                  <p className="font-bold text-emerald-200">{diff.summary.added}</p>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-xs text-red-200/70">Remove</p>
                  <p className="font-bold text-red-200">{diff.summary.removed}</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-200/70">Muda</p>
                  <p className="font-bold text-amber-200">{diff.summary.changed}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={createTemplateFromDiff}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <FileSliders size={15} />
                Criar template do diff
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-4">
            <Search className="mr-3 text-slate-500" size={18} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Filtrar diff por path, valor ou tipo..."
            />
          </div>

          {filteredChanges.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              Nenhuma diferença encontrada com o filtro atual.
            </div>
          ) : (
            <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Antes</th>
                    <th className="px-4 py-3">Depois</th>
                    <th className="px-4 py-3">Campos</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredChanges.map((change) => (
                    <tr
                      key={`${change.changeType}-${change.path}`}
                      className="border-b border-slate-900 transition hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${changeStyle(change.changeType)}`}>
                          {changeLabel(change.changeType)}
                        </span>
                      </td>

                      <td className="max-w-[360px] px-4 py-3">
                        <p className="break-all font-mono text-xs text-slate-300">
                          {change.path}
                        </p>
                      </td>

                      <td className="max-w-[260px] px-4 py-3">
                        <p className="break-all font-mono text-xs text-slate-500">
                          {preview(change.before?.value)}
                        </p>
                      </td>

                      <td className="max-w-[260px] px-4 py-3">
                        <p className="break-all font-mono text-xs text-slate-300">
                          {preview(change.after?.value)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {change.changedFields.join(', ') || '-'}
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
}
