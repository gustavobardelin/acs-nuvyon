// acs-frontend/src/app/login/page.tsx

'use client';

import { useState } from 'react';
import { Lock, Loader2, Mail, Router, ShieldCheck } from 'lucide-react';

interface LoginResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  message?: string | string[];
  statusCode?: number;
}

function saveToken(token: string) {
  window.localStorage.setItem('acs_token', token);
  document.cookie = `acs_token=${token}; path=/; max-age=86400; SameSite=Lax`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nuvyon.com');
  const [password, setPassword] = useState('nuvyon123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        const message =
          data?.message || `Falha no login. HTTP ${response.status}`;

        setError(Array.isArray(message) ? message.join(', ') : String(message));
        return;
      }

      const token = data?.accessToken || data?.access_token || data?.token;

      if (!token) {
        setError('Backend respondeu sucesso, mas não retornou token.');
        return;
      }

      saveToken(token);

      window.location.href = '/';
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      setError(err?.message || 'Erro inesperado ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-950/30">
              <Router size={32} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">ACS Nuvyon</h1>

            <p className="mt-2 text-sm text-slate-400">
              Plataforma corporativa de gestão TR-069
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2 text-sky-400">
                <ShieldCheck size={20} />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                  Acesso seguro
                </span>
              </div>

              <h2 className="text-2xl font-bold">Entrar no sistema</h2>

              <p className="mt-2 text-sm text-slate-500">
                Use suas credenciais para acessar o painel operacional.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  E-mail
                </label>

                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 transition focus-within:border-sky-500">
                  <Mail className="mr-3 text-slate-500" size={18} />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-600"
                    placeholder="admin@nuvyon.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Senha
                </label>

                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 transition focus-within:border-sky-500">
                  <Lock className="mr-3 text-slate-500" size={18} />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-600"
                    placeholder="Digite sua senha"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleLogin();
                      }
                    }}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Nuvyon · A internet do futuro. Hoje.
          </p>
        </div>
      </div>
    </main>
  );
}