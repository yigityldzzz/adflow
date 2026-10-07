'use client';

import { useEffect, useState } from 'react';
import {
  User,
  Key,
  Bell,
  Shield,
  Loader2,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  CreditCard,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan?: string;
  createdAt?: string;
  trial?: { plan: string; endsAt: string } | null;
}

interface BillingSubscription {
  status: string;
  plan: 'PRO' | 'TEAM' | null;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  cardBrand: string | null;
  cardLastFour: string | null;
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
  live: boolean;
}

type TabId = 'profile' | 'billing' | 'security' | 'api' | 'notifications';

const PLAN_PRICES: Record<'PRO' | 'TEAM', string> = { PRO: '€49', TEAM: '€149' };

// Mirrors OPEN_STATUSES in apps/api/src/routes/billing.ts: while one of these
// is set the customer manages the existing subscription instead of buying a new one.
const OPEN_SUB_STATUSES = new Set(['on_trial', 'active', 'past_due', 'cancelled', 'paused', 'unpaid']);

const SUB_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  on_trial: { label: 'Trial', className: 'text-[#6366f1] bg-[#6366f1]/10 border-[#6366f1]/20' },
  active: { label: 'Active', className: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20' },
  cancelled: { label: 'Cancelled', className: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' },
  past_due: { label: 'Payment failed', className: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20' },
  unpaid: { label: 'Unpaid', className: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20' },
  paused: { label: 'Paused', className: 'text-[#64748b] bg-[#e2e8f0] border-[#e2e8f0]' },
  expired: { label: 'Expired', className: 'text-[#64748b] bg-[#e2e8f0] border-[#e2e8f0]' },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function planName(plan: string | null | undefined): string {
  const p = (plan || 'free').toLowerCase();
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'PRO' | 'TEAM' | null>(null);

  // Lemon Squeezy sends the buyer back to /settings?tab=billing&upgraded=1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'billing') setActiveTab('billing');
    if (params.get('upgraded') === '1') {
      setJustUpgraded(true);
      params.delete('upgraded');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  const loadBilling = async (): Promise<BillingSubscription | null> => {
    setBillingLoading(true);
    try {
      const res = await api.get<{ subscription: BillingSubscription | null }>('/api/billing/subscription');
      setSubscription(res.subscription);
      return res.subscription;
    } catch {
      toast({ type: 'error', title: 'Failed to load billing details' });
      return null;
    } finally {
      setBillingLoading(false);
      setBillingLoaded(true);
    }
  };

  useEffect(() => {
    if (activeTab !== 'billing' || billingLoaded) return;
    let cancelled = false;
    (async () => {
      let sub = await loadBilling();
      // Right after checkout the webhook can land a few seconds after the
      // redirect — poll briefly until the new subscription shows up.
      for (let i = 0; justUpgraded && !sub && i < 8 && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (!cancelled) sub = await loadBilling();
      }
      if (sub && justUpgraded && !cancelled) {
        try {
          const me = await api.get<{ user: UserProfile }>('/api/auth/me');
          setUser(me.user);
        } catch { /* ignore */ }
        window.dispatchEvent(new Event('adflow:refresh-user'));
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, justUpgraded]);

  const startCheckout = async (plan: 'PRO' | 'TEAM') => {
    if (checkoutPlan) return;
    setCheckoutPlan(plan);
    try {
      const res = await api.post<{ url: string }>('/api/billing/checkout', { plan });
      window.location.href = res.url;
    } catch (err: unknown) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Could not start checkout' });
      setCheckoutPlan(null);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get<{ user: UserProfile } | UserProfile>('/api/auth/me');
        const u = (res as { user?: UserProfile }).user ?? (res as UserProfile);
        setUser(u);
        setForm({ name: u.name || '', email: u.email || '' });
      } catch {
        toast({ type: 'error', title: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };
    const fetchApiKey = async () => {
      try {
        const res = await api.get<{ apiKey: string | null }>('/api/auth/api-key');
        setApiKey(res.apiKey);
      } catch { /* ignore */ }
    };
    fetchUser();
    fetchApiKey();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.patch('/api/auth/me', { name: form.name, email: form.email });
      toast({ type: 'success', title: 'Profile updated!' });
      setUser((u) => u ? { ...u, ...form } : u);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Update failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPw) return;
    if (pwForm.new !== pwForm.confirm) {
      toast({ type: 'error', title: 'Passwords do not match' });
      return;
    }
    if (pwForm.new.length < 8) {
      toast({ type: 'error', title: 'Password too short', description: 'Must be at least 8 characters' });
      return;
    }
    setSavingPw(true);
    try {
      await api.patch('/api/auth/me', { currentPassword: pwForm.current, password: pwForm.new });
      toast({ type: 'success', title: 'Password updated!' });
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Failed to update password', description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingPw(false);
    }
  };

  const generateApiKey = async () => {
    if (generatingKey) return;
    setGeneratingKey(true);
    try {
      const res = await api.post<{ apiKey: string }>('/api/auth/api-key', {});
      setApiKey(res.apiKey);
      toast({ type: 'success', title: 'API key generated!' });
    } catch {
      toast({ type: 'error', title: 'Failed to generate API key' });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({ type: 'success', title: 'API key copied!' });
    } catch {
      toast({ type: 'error', title: 'Failed to copy' });
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'billing', label: 'Plan & Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'api', label: 'API Access', icon: <Key className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ] as const;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-40 skeleton rounded-xl" />
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 h-72 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-[#0f172a]">Settings</h2>
        <p className="text-sm text-[#94a3b8] mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#6366f1] text-white shadow-md'
                : 'text-[#94a3b8] hover:text-[#64748b]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Profile Information</h3>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 border border-[#6366f1]/20 flex items-center justify-center">
              <span className="text-xl font-bold text-[#a5b4fc]">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">{user?.name}</p>
              <p className="text-xs text-[#94a3b8]">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full border border-[#6366f1]/20 capitalize">
                {user?.plan || 'free'} plan
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Plan & Billing Tab */}
      {activeTab === 'billing' && (() => {
        const hasOpenSub = !!subscription && OPEN_SUB_STATUSES.has(subscription.status);
        const subPlan = subscription?.plan ?? null;
        const price = subPlan ? PLAN_PRICES[subPlan] : null;
        const statusMeta = subscription ? SUB_STATUS_LABELS[subscription.status] : undefined;
        const trialDaysLeft = user?.trial?.endsAt
          ? Math.max(1, Math.ceil((new Date(user.trial.endsAt).getTime() - Date.now()) / 86400000))
          : null;

        return (
          <div className="space-y-4">
            {justUpgraded && (
              <div className="flex items-start gap-3 p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl">
                {hasOpenSub
                  ? <CheckCircle2 className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                  : <Loader2 className="w-5 h-5 text-[#10b981] animate-spin flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Thank you for subscribing!</p>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {hasOpenSub
                      ? `Your ${planName(subPlan)} plan is active. A receipt is on its way to your inbox.`
                      : 'We are activating your plan — this usually takes a few seconds.'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Current Plan</h3>

              {billingLoading && !billingLoaded ? (
                <div className="h-20 skeleton rounded-xl" />
              ) : (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-[#0f172a]">
                      {hasOpenSub ? planName(subPlan ?? user?.plan) : trialDaysLeft !== null ? `${planName(user?.trial?.plan)} trial` : planName(user?.plan)}
                    </p>
                    {hasOpenSub && statusMeta && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    )}
                    {hasOpenSub && price && <span className="text-xs text-[#94a3b8]">{price}/month</span>}
                  </div>

                  <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">
                    {!hasOpenSub && trialDaysLeft !== null &&
                      `Your free trial ends on ${formatDate(user?.trial?.endsAt)} (${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left). Subscribe below to keep Pro features.`}
                    {!hasOpenSub && trialDaysLeft === null && 'You are on the Free plan. Upgrade below to unlock more.'}
                    {subscription?.status === 'on_trial' &&
                      `Free trial until ${formatDate(subscription.trialEndsAt)}. After that you'll be billed ${price ?? ''}/month — cancel anytime before then and you won't be charged.`}
                    {subscription?.status === 'active' && `Renews on ${formatDate(subscription.renewsAt)}.`}
                    {subscription?.status === 'cancelled' &&
                      `Cancelled — you keep ${planName(subPlan)} until ${formatDate(subscription.endsAt)}. You can resume anytime before then.`}
                    {subscription?.status === 'past_due' &&
                      `We couldn't charge your card. Please update your payment method to keep ${planName(subPlan)}.`}
                    {subscription?.status === 'unpaid' && 'Your subscription is unpaid. Update your payment method to reactivate it.'}
                    {subscription?.status === 'paused' && 'Your subscription is paused. Resume it to get your plan back.'}
                  </p>

                  {hasOpenSub && subscription?.cardLastFour && (
                    <p className="text-xs text-[#94a3b8] mt-1.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="capitalize">{subscription.cardBrand || 'Card'}</span> •••• {subscription.cardLastFour}
                    </p>
                  )}
                </div>
              )}

              {hasOpenSub && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {subscription?.customerPortalUrl ? (
                    <>
                      <a
                        href={subscription.customerPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {subscription.status === 'cancelled' || subscription.status === 'paused' ? 'Resume subscription' : 'Manage subscription'}
                      </a>
                      {subscription.updatePaymentMethodUrl && (
                        <a
                          href={subscription.updatePaymentMethodUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] px-4 py-2.5 rounded-xl transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Update payment method
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[#94a3b8]">
                      To manage your subscription, use the &quot;Manage subscription&quot; link in your Lemon Squeezy receipt email.
                    </p>
                  )}
                </div>
              )}
            </div>

            {!hasOpenSub && billingLoaded && (
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  { id: 'PRO' as const, name: 'Pro', desc: 'Unlimited clicks & links, AI insights, conversion postbacks, bot detection, 1-year data retention.' },
                  { id: 'TEAM' as const, name: 'Team', desc: 'Everything in Pro, plus multi-user access, white-label reports, API access and unlimited data retention.' },
                ]).map((p) => (
                  <div key={p.id} className={`bg-[#ffffff] border rounded-2xl p-5 flex flex-col ${p.id === 'PRO' ? 'border-[#6366f1]/40' : 'border-[#e2e8f0]'}`}>
                    <p className="text-sm font-semibold text-[#0f172a]">{p.name}</p>
                    <p className="mt-1">
                      <span className="text-2xl font-bold text-[#0f172a]">{PLAN_PRICES[p.id]}</span>
                      <span className="text-xs text-[#94a3b8]">/month</span>
                    </p>
                    <p className="text-xs text-[#64748b] mt-2 leading-relaxed flex-1">{p.desc}</p>
                    <button
                      onClick={() => startCheckout(p.id)}
                      disabled={checkoutPlan !== null}
                      className={`mt-4 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                        p.id === 'PRO'
                          ? 'bg-[#6366f1] hover:bg-[#5558e3] text-white'
                          : 'border border-[#e2e8f0] text-[#0f172a] hover:border-[#6366f1]/40'
                      }`}
                    >
                      {checkoutPlan === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {checkoutPlan === p.id ? 'Redirecting…' : `Subscribe to ${p.name}`}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Payments are processed securely by Lemon Squeezy, our Merchant of Record. Billed monthly, cancel anytime.{' '}
              <a href="/terms#refunds" className="text-[#6366f1] hover:underline">Refund policy</a>
            </p>
          </div>
        );
      })()}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={pwForm.new}
                onChange={(e) => setPwForm((p) => ({ ...p, new: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="••••••••"
                className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-1 transition-colors ${
                  pwForm.confirm && pwForm.new !== pwForm.confirm
                    ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/50'
                    : 'border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/50'
                }`}
              />
              {pwForm.confirm && pwForm.new !== pwForm.confirm && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3 text-[#ef4444]" />
                  <p className="text-xs text-[#ef4444]">Passwords don't match</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {savingPw ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-2">API Access</h3>
          <p className="text-xs text-[#94a3b8] mb-5">
            Use your API key to access AdFlow programmatically. Keep it secret — treat it like a password.
          </p>

          {apiKey ? (
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Your API Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 font-mono text-sm text-[#64748b] overflow-hidden">
                  {showApiKey ? apiKey : '•'.repeat(40)}
                </div>
                <button
                  onClick={() => setShowApiKey((p) => !p)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:text-[#64748b] transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyApiKey}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:text-[#6366f1] transition-colors"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-4 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                <p className="text-xs font-medium text-[#64748b] mb-2">Example usage</p>
                <code className="text-xs font-mono text-[#818cf8]">
                  curl -H &quot;Authorization: Bearer {'<API_KEY>'}&quot; \<br />
                  &nbsp;&nbsp;https://adflow.digitaladexpert.de/api/analytics/overview
                </code>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={generateApiKey}
                  disabled={generatingKey}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#ef4444] border border-[#e2e8f0] hover:border-[#ef4444]/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {generatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Regenerate key
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Key className="w-8 h-8 text-[#94a3b8]" />
              <p className="text-sm text-[#94a3b8]">No API key generated yet</p>
              <button
                onClick={generateApiKey}
                disabled={generatingKey}
                className="flex items-center gap-2 text-sm font-medium bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors"
              >
                {generatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {generatingKey ? 'Generating…' : 'Generate API Key'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { label: 'Weekly performance report', desc: 'Get a summary of your campaign performance every Monday', enabled: true },
              { label: 'Bot traffic alerts', desc: 'Notify when bot traffic exceeds 10% of total clicks', enabled: true },
              { label: 'Conversion milestones', desc: 'Alert when campaigns hit conversion goals', enabled: false },
              { label: 'Budget alerts', desc: 'Warn when campaigns are near budget limits', enabled: true },
              { label: 'System updates', desc: 'Product updates, new features, and maintenance notices', enabled: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-start justify-between gap-4 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                <div>
                  <p className="text-sm font-medium text-[#0f172a]">{pref.label}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{pref.desc}</p>
                </div>
                <button
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                    pref.enabled ? 'bg-[#6366f1]' : 'bg-[#e2e8f0]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      pref.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <button className="mt-5 flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            <Check className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
