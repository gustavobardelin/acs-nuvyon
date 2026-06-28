// acs-frontend/src/components/templates/TemplateParametersEditor.tsx

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { ProvisioningTemplateParameter } from '@/types/provisioning-templates';

const PARAMETER_TYPES = [
  'xsd:string',
  'xsd:boolean',
  'xsd:unsignedInt',
  'xsd:int',
  'xsd:integer',
  'xsd:dateTime',
];

function parseValue(value: string, type: string): string | number | boolean {
  if (type === 'xsd:boolean') {
    return value === 'true';
  }

  if (
    type === 'xsd:unsignedInt' ||
    type === 'xsd:int' ||
    type === 'xsd:integer'
  ) {
    const parsed = Number(value);

    if (Number.isNaN(parsed)) return 0;

    return parsed;
  }

  return value;
}

function valueToString(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  return String(value ?? '');
}

export function TemplateParametersEditor({
  parameters,
  onChange,
}: {
  parameters: ProvisioningTemplateParameter[];
  onChange: (parameters: ProvisioningTemplateParameter[]) => void;
}) {
  function updateParameter(
    index: number,
    field: keyof ProvisioningTemplateParameter,
    rawValue: string,
  ) {
    const next = [...parameters];
    const current = next[index];

    if (!current) return;

    if (field === 'type') {
      next[index] = {
        ...current,
        type: rawValue,
        value: parseValue(valueToString(current.value), rawValue),
      };
    } else if (field === 'value') {
      next[index] = {
        ...current,
        value: parseValue(rawValue, current.type),
      };
    } else {
      next[index] = {
        ...current,
        [field]: rawValue,
      };
    }

    onChange(next);
  }

  function addParameter() {
    onChange([
      ...parameters,
      {
        path: '',
        value: '',
        type: 'xsd:string',
      },
    ]);
  }

  function removeParameter(index: number) {
    onChange(parameters.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Parâmetros TR-069</h3>
          <p className="text-sm text-slate-500">
            Informe path, valor e tipo que serão enviados ao GenieACS.
          </p>
        </div>

        <button
          type="button"
          onClick={addParameter}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {parameters.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Adicione pelo menos um parâmetro.
        </div>
      )}

      <div className="space-y-3">
        {parameters.map((parameter, index) => (
          <div
            key={`${index}-${parameter.path}`}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.7fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Path
                </label>
                <input
                  value={parameter.path}
                  onChange={(event) =>
                    updateParameter(index, 'path', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-sky-500"
                  placeholder="Device.ManagementServer.PeriodicInformInterval"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Valor
                </label>

                {parameter.type === 'xsd:boolean' ? (
                  <select
                    value={valueToString(parameter.value)}
                    onChange={(event) =>
                      updateParameter(index, 'value', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    value={valueToString(parameter.value)}
                    onChange={(event) =>
                      updateParameter(index, 'value', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    placeholder="300"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tipo
                </label>
                <select
                  value={parameter.type}
                  onChange={(event) =>
                    updateParameter(index, 'type', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  {PARAMETER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeParameter(index)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/80">
        Por segurança, o backend bloqueia parâmetros sensíveis como Password,
        KeyPassphrase, PreSharedKey e RadiusSecret em templates genéricos.
      </div>
    </div>
  );
}
