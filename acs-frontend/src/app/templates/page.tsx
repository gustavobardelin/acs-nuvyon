// acs-frontend/src/app/templates/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit,
  FileSliders,
  Loader2,
  Plus,
  Play,
  Power,
  RefreshCw,
  Search,
  Tags,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProvisioningTemplate } from '@/types/provisioning-templates';
import { TemplateFormModal } from '@/components/templates/TemplateFormModal';
import { BulkApplyTemplateModal } from '@/components/templates/BulkApplyTemplateModal';

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ProvisioningTemplate | null>(null);
  const [bulkTemplate, setBulkTemplate] =
    useState<ProvisioningTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return templates;

    return templates.filter((template) => {
      return [
        template.name,
        template.description,
        template.vendor,
        template.model,
        template.productClass,
        ...(template.tags || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [templates, q]);

  async function loadTemplates() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ProvisioningTemplate[]>(
        '/provisioning-templates',
        {
          params: {
            includeInactive,
          },
        },
      );

      setTemplates(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar templates.',
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingTemplate(null);
    setModalOpen(true);
  }

  function openEditModal(template: ProvisioningTemplate) {
    setEditingTemplate(template);
    setModalOpen(true);
  }

  function openBulkModal(template: ProvisioningTemplate) {
    setBulkTemplate(template);
  }

  async function handleSaved() {
    setModalOpen(false);
    setEditingTemplate(null);
    await loadTemplates();
  }

  async function toggleTemplate(template: ProvisioningTemplate) {
    const nextStatus = template.status === 'active' ? 'inactive' : 'active';

    try {
      await api.patch(`/provisioning-templates/${template.id}`, {
        status: nextStatus,
      });

      await loadTemplates();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao alterar status.',
      );
    }
  }

  async function deleteTemplate(template: ProvisioningTemplate) {
    const confirmed = window.confirm(
      `Excluir o template "${template.name}"? Essa ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/provisioning-templates/${template.id}`);
      await loadTemplates();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao excluir template.',
      );
    }
  }

  useEffect(() => {
    loadTemplates();
  }, [includeInactive]);

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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <FileSliders size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  ACS Nuvyon
                </p>
                <h1 className="text-3xl font-bold tracking-tight">
                  Provisioning Templates
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Biblioteca de templates TR-069 para aplicar configurações em CPEs
              via GenieACS e Connection Request.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadTemplates}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <Plus size={17} />
              Novo template
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4">
            <Search className="mr-3 text-slate-500" size={18} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Buscar por nome, modelo, vendor ou tag..."
            />
          </div>

          <button
            type="button"
            onClick={() => setIncludeInactive((current) => !current)}
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold transition ${
              includeInactive
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                : 'border-slate-800 bg-slate-950/80 text-slate-400'
            }`}
          >
            {includeInactive ? 'Mostrando inativos' : 'Ocultando inativos'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Carregando templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-slate-500">
            Nenhum template encontrado.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {template.name}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          template.status === 'active'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                        }`}
                      >
                        {template.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <p className="max-w-3xl text-sm text-slate-400">
                      {template.description || 'Sem descrição.'}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Vendor</p>
                        <p className="mt-1 font-semibold text-white">
                          {template.vendor || '-'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Modelo</p>
                        <p className="mt-1 font-semibold text-white">
                          {template.model || 'Genérico'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Product Class</p>
                        <p className="mt-1 font-semibold text-white">
                          {template.productClass || '-'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">
                        <p className="text-xs text-slate-500">Parâmetros</p>
                        <p className="mt-1 font-semibold text-white">
                          {template.parameters.length}
                        </p>
                      </div>
                    </div>

                    {template.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-400"
                          >
                            <Tags size={11} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-sky-300 hover:text-sky-200">
                        Ver parâmetros
                      </summary>

                      <div className="mt-3 space-y-2">
                        {template.parameters.map((parameter, index) => (
                          <div
                            key={`${template.id}-${parameter.path}-${index}`}
                            className="rounded-xl bg-slate-900/70 p-3"
                          >
                            <p className="break-all font-mono text-xs text-slate-300">
                              {parameter.path}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {String(parameter.value)} · {parameter.type}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>

                    <p className="mt-4 text-xs text-slate-600">
                      Criado por {template.createdByEmail || '-'} · Atualizado em{' '}
                      {formatDate(template.updatedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openBulkModal(template)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <Play size={15} />
                      Aplicar em lote
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(template)}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                    >
                      <Edit size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleTemplate(template)}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
                    >
                      <Power size={15} />
                      {template.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTemplate(template)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <TemplateFormModal
          open={modalOpen}
          template={editingTemplate}
          onClose={() => {
            setModalOpen(false);
            setEditingTemplate(null);
          }}
          onSaved={handleSaved}
        />

        <BulkApplyTemplateModal
          open={Boolean(bulkTemplate)}
          template={bulkTemplate}
          onClose={() => setBulkTemplate(null)}
          onApplied={loadTemplates}
        />
      </div>
    </main>
  );
}
