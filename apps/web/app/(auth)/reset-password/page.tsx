'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Read the token from the URL on the client, then drop it from the address
  // bar so it isn't left in history or leaked through the Referer header.
  // sessionStorage keeps it for this tab only, so a reload still works.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) {
      sessionStorage.setItem('adflow_reset_token', fromUrl);
      window.history.replaceState(null, '', window.location.pathname);
    }
    setToken(fromUrl ?? sessionStorage.getItem('adflow_reset_token') ?? '');
  }, []);

  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !token) return;
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password: form.password });
      sessionStorage.removeItem('adflow_reset_token');
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366f1]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8b5cf6]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0f172a] tracking-tight">
                Ad<span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Flow</span>
              </span>
            </Link>
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Password updated</h1>
              <p className="text-sm text-[#64748b] leading-relaxed">
                Your new password is set and you&apos;ve been signed out on all devices. Sign in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-6 w-full inline-flex items-center justify-center bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                Sign in
              </Link>
            </div>
          ) : token === '' ? (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[#ef4444]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Invalid reset link</h1>
              <p className="text-sm text-[#64748b] leading-relaxed">
                This link is incomplete. Please open the link from your email again, or request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 w-full inline-flex items-center justify-center bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Choose a new password</h1>
                <p className="text-sm text-[#64748b]">At least 8 characters.</p>
              </div>

              {error && (
                <div className="mb-6 p-3.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <p className="text-sm text-[#ef4444] text-center">{error}</p>
                  {error.includes('expired') && (
                    <p className="text-center mt-2">
                      <Link href="/forgot-password" className="text-sm font-medium text-[#6366f1] hover:text-[#818cf8]">
                        Request a new link →
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#64748b] mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-[#64748b] mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={form.confirm}
                    onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  {mismatch && <p className="text-xs text-[#ef4444] mt-1.5">Passwords don&apos;t match</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || token === null}
                  className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Set new password'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
