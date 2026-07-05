'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceDetails, DeviceSummary } from '@/types/devices';
import { ModelProfile } from '@/types/model-profiles';

function normalize(value: unknown) {
  return String(value || '-').trim() || '-';
}

function statusStyle(status: string) {
  if (status === 'active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'draft') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function statusLabel(status: string) {
  if (status === 'active') return 'Ativo';
  if (status === 'draft') return 'Rascunho';
  if (status === 'deprecated') return 'Depreciado';
  return status;
}

export function DeviceModelProfileCard({
  device,
}: {
  device: Partial<DeviceSummary & DeviceDetails>;
}) {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const manufacturer = normalize((device as any).manufacturer);
  const model = normalize((device as any).model);
  const productClass = normalize((device as any).productClass);

  const knownPaths = useMemo(() => {
    return Object.entries(profile?.parameterMap || {}).filter(([, value]) =>
      Boolean(value),
    );
  }, [profile]);

  const capabilities = useMemo(() => {
    return Object.entries(profile?.capabilities || {});
  }, [profile]);

  async function loadProfile() {
    if (!device?.id) return;

    setLoading(true);

    try {
      const response = await api.get<ModelProfile | null>(
        '/model-profiles/by-model',
        {
          params: {
            manufacturer,
            model,
            productClass,
          },
        },
      );

      setProfile(response.data || null);
    } catch (err: any) {
      console.error(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function createProfileFromDevice() {
    const confirmed = window.confirm(
      `Analisar o CPE e criar perfil técnico sugerido para ${manufacturer} ${model} (${productClass})?`,
    );

    if (!confirmed) return;

    setCreating(true);

    try {
      const suggestionResponse = await api.get<{
        profile: Partial<ModelProfile>;
        evidence: {
          parameterCount: number;
          foundPaths: string[];
        };
      }>('/model-profiles/suggest/from-device', {
        params: {
          deviceId: device.id,
        },
      });

      const suggestedProfile = suggestionResponse.data.profile;

      const response = await api.post<ModelProfile>('/model-profiles', {
        ...suggestedProfile,
        status: 'draft',
      });

      setProfile(response.data);

      alert(
        `Perfil sugerido criado como rascunho.\n\n` +
          `Parâmetros analisados: ${suggestionResponse.data.evidence.parameterCount}\n` +
          `Paths reconhecidos: ${suggestionResponse.data.evidence.foundPaths.length}\n\n` +
          `Revise na Base de Modelos antes de marcar como ativo.`,
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao criar perfil sugerido do modelo.',
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [device?.id, manufacturer, model, productClass]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <BookOpen size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Base técnica do modelo
            </p>
          </div>

          <h2 className="text-lg font-bold text-white">
            Perfil de conhecimento deste CPE
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Relaciona o CPE atual com a base técnica de paths, capabilities,
            templates e observações por modelo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadProfile}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Atualizar
          </button>

          <a
            href="/model-profiles"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <ExternalLink size={15} />
            Base de modelos
          </a>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Fabricante
          </p>
          <p className="mt-2 text-white">{manufacturer}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Modelo
          </p>
          <p className="mt-2 text-white">{model}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Product Class
          </p>
          <p className="mt-2 text-white">{productClass}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Buscando perfil técnico...
        </div>
      ) : !profile ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-200">
            Nenhum perfil técnico cadastrado para este modelo.
          </p>

          <p className="mt-2 text-sm text-amber-100/70">
            Crie um perfil para documentar paths conhecidos, capabilities,
            templates recomendados e observações desse modelo.
          </p>

          <button
            type="button"
            onClick={createProfileFromDevice}
            disabled={creating}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            Criar perfil sugerido
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                profile.status,
              )}`}
            >
              {statusLabel(profile.status)}
            </span>

            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              Root: {profile.rootObject}
            </span>

            {profile.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              {profile.displayName}
            </h3>

            {profile.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                {profile.notes}
              </p>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Paths conhecidos
              </p>

              {knownPaths.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum path cadastrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {knownPaths.slice(0, 12).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500">{key}</p>
                      <p className="break-all font-mono text-xs text-slate-300">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Capabilities do modelo
              </p>

              {capabilities.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma capability cadastrada.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capabilities.map(([key, value]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                        value
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700 bg-slate-950 text-slate-500'
                      }`}
                    >
                      {value ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {key}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Templates recomendados
              </p>

              {profile.recommendedTemplates?.length ? (
                <div className="space-y-2">
                  {profile.recommendedTemplates.map((template) => (
                    <p
                      key={template}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                    >
                      {template}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Nenhum template recomendado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
