'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-[#10b981]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Check your inbox</h1>
              <p className="text-sm text-[#64748b] leading-relaxed">
                If an AdFlow account exists for <span className="font-medium text-[#0f172a]">{email}</span>, we&apos;ve sent a link to
                reset your password. It expires in 1 hour.
              </p>
              <p className="text-xs text-[#94a3b8] mt-4 leading-relaxed">
                Nothing arrived after a few minutes? Check your spam folder, or write to{' '}
                <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:text-[#818cf8]">info@digitaladexpert.de</a>.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Forgot your password?</h1>
                <p className="text-sm text-[#64748b]">Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              {error && (
                <div className="mb-6 p-3.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <p className="text-sm text-[#ef4444] text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#64748b] mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
