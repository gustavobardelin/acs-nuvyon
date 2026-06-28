// acs-frontend/src/components/device/WifiPasswordField.tsx

'use client';

import { useState } from 'react';
import { Clipboard, Eye, EyeOff, LockKeyhole } from 'lucide-react';

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

function isUsefulPassword(value: string | null | undefined): boolean {
  if (!value) return false;

  const normalized = String(value).trim();

  if (!normalized) return false;
  if (normalized === '-') return false;
  if (normalized.toLowerCase() === 'null') return false;
  if (normalized.toLowerCase() === 'undefined') return false;

  return true;
}

function isMaskedPassword(value: string): boolean {
  const normalized = value.trim();

  return normalized.length > 0 && normalized.split('').every((char) => char === '*');
}

export function WifiPasswordField({
  password,
  onNotify,
}: {
  password: string | null | undefined;
  onNotify?: (message: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  if (!isUsefulPassword(password)) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
        <div className="flex items-center gap-2 text-amber-300">
          <LockKeyhole size={15} />
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Senha Wi-Fi
          </p>
        </div>

        <p className="mt-2 text-sm text-amber-200">
          Não sincronizada ou não informada pelo CPE.
        </p>

        <p className="mt-1 text-xs text-amber-200/60">
          Tente atualizar os parâmetros de Wi-Fi.
        </p>
      </div>
    );
  }

  const normalizedPassword = String(password).trim();
  const maskedByCpe = isMaskedPassword(normalizedPassword);

  async function handleCopy() {
    if (!normalizedPassword || maskedByCpe) return;

    await copyText(normalizedPassword);
    onNotify?.('Senha Wi-Fi copiada.');
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <LockKeyhole size={15} />
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Senha Wi-Fi
          </p>
        </div>

        {!maskedByCpe && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              {visible ? <EyeOff size={13} /> : <Eye size={13} />}
              {visible ? 'Ocultar' : 'Ver'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
            >
              <Clipboard size={13} />
              Copiar
            </button>
          </div>
        )}
      </div>

      {maskedByCpe ? (
        <>
          <p className="font-mono text-sm text-amber-300">
            {normalizedPassword}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            O roteador retornou a senha mascarada. Esse firmware pode bloquear leitura.
          </p>
        </>
      ) : (
        <p className="break-all font-mono text-sm text-white">
          {visible ? normalizedPassword : '••••••••••••'}
        </p>
      )}
    </div>
  );
}
