'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface InvitePreview {
  email: string;
  role: string;
  organization: { name: string };
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!token) { setError('Missing invite token'); setLoading(false); return; }
    api.get<{ invite: InvitePreview }>(`/api/organizations/invite/${token}`)
      .then((res) => setInvite(res.invite))
      .catch((e) => setError(e instanceof Error ? e.message : 'Invite not found or expired'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError('');
    try {
      await api.post(`/api/organizations/invite/${token}/accept`, {});
      setAccepted(true);
      setTimeout(() => router.push('/team'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-[#0f172a]">
            Ad<span className="gradient-text">Flow</span>
          </span>
        </div>

        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm text-center">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#6366f1] mx-auto" />
          ) : accepted ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-[#10b981] mx-auto mb-3" />
              <p className="text-base font-semibold text-[#0f172a] mb-1">You&apos;re in!</p>
              <p className="text-sm text-[#64748b]">Redirecting to your team…</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-10 h-10 text-[#ef4444] mx-auto mb-3" />
              <p className="text-sm text-[#ef4444]">{error}</p>
            </>
          ) : invite ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-[#6366f1]" />
              </div>
              <p className="text-base font-semibold text-[#0f172a] mb-1">
                Join <span className="text-[#6366f1]">{invite.organization.name}</span>
              </p>
              <p className="text-sm text-[#64748b] mb-6">
                Invited as <strong>{invite.role.toLowerCase()}</strong> to <strong>{invite.email}</strong>
              </p>

              {isLoggedIn ? (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Accept Invite
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[#94a3b8] mb-3">Sign in or create an account with <strong>{invite.email}</strong> first, then come back to this link.</p>
                  <Link href="/login" className="block w-full bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    Sign In
                  </Link>
                  <Link href="/register" className="block w-full border border-[#e2e8f0] hover:bg-[#e2e8f0] text-[#64748b] font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    Create Account
                  </Link>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
