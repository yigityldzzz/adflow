'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', 'text-[#ef4444]', 'text-[#f59e0b]', 'text-[#10b981]', 'text-[#10b981]'][passwordStrength];
  const strengthBarColors = ['', 'bg-[#ef4444]', 'bg-[#f59e0b]', 'bg-[#10b981]', 'bg-[#10b981]'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ accessToken: string; user: unknown }>('/api/auth/register', form);
      setToken(res.accessToken);
      if (res.user) setUser(res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#6366f1]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#8b5cf6]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
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

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Create your account</h1>
            <p className="text-sm text-[#64748b]">
              Start tracking smarter. Free forever, no credit card required.
            </p>
          </div>

          {/* Perks */}
          <div className="grid grid-cols-3 gap-3 mb-7 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
            {[
              { label: '10K clicks/mo', sub: 'Free plan' },
              { label: 'No credit card', sub: 'Required' },
              { label: 'Setup in minutes', sub: 'No coding needed' },
            ].map((perk) => (
              <div key={perk.label} className="text-center">
                <Check className="w-4 h-4 text-[#10b981] mx-auto mb-1" />
                <p className="text-xs font-medium text-[#0f172a] leading-tight">{perk.label}</p>
                <p className="text-[10px] text-[#94a3b8]">{perk.sub}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
              <p className="text-sm text-[#ef4444] text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#64748b] mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="John Smith"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#64748b] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#64748b] mb-1.5">
                Password
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
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 pr-11 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength ? strengthBarColors[passwordStrength] : 'bg-[#e2e8f0]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strengthColor}`}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-[#94a3b8]">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-[#6366f1] hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-[#6366f1] hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Free Account →'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-[#64748b] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
