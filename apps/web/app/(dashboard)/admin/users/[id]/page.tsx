'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Crown, ArrowLeft, Ban, Zap, User, MousePointerClick, Target,
  Link2, Megaphone, DollarSign, Save, Trash2, ShieldAlert, Shield,
  CheckCircle, XCircle, Calendar, StickyNote, LogIn, Clock, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { startImpersonation } from '@/lib/auth';

interface AdminUserDetail {
  id: string;
  name?: string;
  email: string;
  plan: string;
  role: string;
  suspended: boolean;
  notes?: string;
  createdAt: string;
  trialPlan?: string | null;
  trialEndsAt?: string | null;
  stats: {
    totalClicks: number;
    totalConversions: number;
    revenue: number;
    totalLinks: number;
    totalCampaigns: number;
  };
  links: {
    id: string;
    slug: string;
    destination: string;
    createdAt: string;
    _count: { clicks: number; conversions: number };
  }[];
  campaigns: {
    id: string;
    name: string;
    source: string;
    status: string;
    createdAt: string;
  }[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-[#64748b] bg-[#e2e8f0] border-[#cbd5e1]',
  PRO: 'text-[#a5b4fc] bg-[#6366f1]/20 border-[#6366f1]/30',
  TEAM: 'text-[#c4b5fd] bg-[#8b5cf6]/20 border-[#8b5cf6]/30',
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <User className="w-3 h-3" />,
  PRO: <Zap className="w-3 h-3" />,
  TEAM: <Crown className="w-3 h-3" />,
};

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [trialPlan, setTrialPlan] = useState<'PRO' | 'TEAM'>('PRO');
  const [trialDays, setTrialDays] = useState(14);
  const [settingTrial, setSettingTrial] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ user: AdminUserDetail }>(`/api/admin/users/${userId}`);
      const u = (res as { user: AdminUserDetail }).user;
      setUser(u);
      setNotes(u.notes ?? '');
      setSelectedPlan(u.plan);
      setSelectedRole(u.role);
    } catch {
      router.replace('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await api.patch<{ user: AdminUserDetail }>(`/api/admin/users/${userId}`, {
        plan: selectedPlan,
        role: selectedRole,
        notes,
      });
      const u = (res as { user: AdminUserDetail }).user;
      setUser((prev) => prev ? { ...prev, plan: u.plan, role: u.role, notes: u.notes } : prev);
      showToast('Saved successfully');
    } catch {
      showToast('Failed to save', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/users/${userId}`, { suspended: !user.suspended });
      setUser((prev) => prev ? { ...prev, suspended: !prev.suspended } : prev);
      showToast(user.suspended ? 'User unsuspended' : 'User suspended');
    } catch {
      showToast('Failed to update status', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTrial = async () => {
    if (!user) return;
    setSettingTrial(true);
    try {
      const res = await api.post<{ user: AdminUserDetail }>(`/api/admin/users/${userId}/trial`, {
        plan: trialPlan,
        days: trialDays,
      });
      const u = (res as { user: AdminUserDetail }).user;
      setUser((prev) => prev ? { ...prev, trialPlan: u.trialPlan, trialEndsAt: u.trialEndsAt } : prev);
      showToast(`${trialDays} günlük ${trialPlan} trial başlatıldı`);
    } catch {
      showToast('Trial başlatılamadı', 'err');
    } finally {
      setSettingTrial(false);
    }
  };

  const handleCancelTrial = async () => {
    if (!user) return;
    setSettingTrial(true);
    try {
      await api.delete(`/api/admin/users/${userId}/trial`);
      setUser((prev) => prev ? { ...prev, trialPlan: null, trialEndsAt: null } : prev);
      showToast('Trial iptal edildi');
    } catch {
      showToast('Trial iptal edilemedi', 'err');
    } finally {
      setSettingTrial(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;
    setImpersonating(true);
    try {
      const res = await api.post<{ token: string }>(`/api/admin/users/${userId}/impersonate`, {});
      const { token } = res as { token: string };
      startImpersonation(token);
      router.push('/dashboard');
    } catch {
      showToast('Impersonation failed', 'err');
      setImpersonating(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      router.push('/admin/users');
    } catch {
      showToast('Failed to delete user', 'err');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 skeleton rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
      </div>
      <div className="h-48 skeleton rounded-2xl" />
    </div>
  );

  if (!user) return null;

  const isDirty = selectedPlan !== user.plan || selectedRole !== user.role || notes !== (user.notes ?? '');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all ${
          toast.type === 'ok'
            ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
        }`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/users')} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#a5b4fc]">{(user.name || user.email).charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[#0f172a]">{user.name || user.email}</h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PLAN_COLORS[user.plan] || PLAN_COLORS.FREE}`}>
                  {PLAN_ICONS[user.plan]} {user.plan}
                </span>
                {user.role === 'ADMIN' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-2 py-0.5 rounded-md">
                    <Crown className="w-3 h-3" /> ADMIN
                  </span>
                )}
                {user.suspended && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-2 py-0.5 rounded-md">
                    <Ban className="w-3 h-3" /> Suspended
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-sm text-[#94a3b8]">{user.email}</p>
                <span className="text-[#cbd5e1]">·</span>
                <p className="text-xs text-[#94a3b8] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleImpersonate}
            disabled={impersonating || user.suspended}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border bg-[#6366f1]/10 border-[#6366f1]/30 text-[#a5b4fc] hover:bg-[#6366f1]/20 transition-colors disabled:opacity-40"
            title={user.suspended ? 'Suspended users cannot be impersonated' : ''}
          >
            <LogIn className="w-3.5 h-3.5" />
            {impersonating ? 'Giriş yapılıyor…' : 'Login as User'}
          </button>
          <button
            onClick={handleToggleSuspend}
            disabled={saving}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              user.suspended
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20'
                : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/20'
            }`}
          >
            {user.suspended ? <><Shield className="w-3.5 h-3.5" /> Unsuspend</> : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Clicks', value: user.stats.totalClicks.toLocaleString(), icon: <MousePointerClick className="w-4 h-4" />, color: 'text-[#6366f1]' },
          { label: 'Conversions', value: user.stats.totalConversions.toLocaleString(), icon: <Target className="w-4 h-4" />, color: 'text-[#10b981]' },
          { label: 'Revenue', value: `$${user.stats.revenue.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-[#f59e0b]' },
          { label: 'Links', value: user.stats.totalLinks, icon: <Link2 className="w-4 h-4" />, color: 'text-[#8b5cf6]' },
          { label: 'Campaigns', value: user.stats.totalCampaigns, icon: <Megaphone className="w-4 h-4" />, color: 'text-[#ec4899]' },
        ].map((s) => (
          <div key={s.label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#94a3b8]">{s.label}</p>
              <div className={`${s.color}`}>{s.icon}</div>
            </div>
            <p className="text-xl font-bold text-[#0f172a]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Admin controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan & Role */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#6366f1]" /> Account Controls
          </h3>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-2 uppercase tracking-wider">Plan</label>
            <div className="flex gap-2">
              {['FREE', 'PRO', 'TEAM'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlan(p)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    selectedPlan === p
                      ? PLAN_COLORS[p] + ' ring-1 ring-[#6366f1]/40'
                      : 'bg-[#f8fafc] text-[#94a3b8] border-[#e2e8f0] hover:text-[#64748b]'
                  }`}
                >
                  {PLAN_ICONS[p]} {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-2 uppercase tracking-wider">Role</label>
            <div className="flex gap-2">
              {['USER', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    selectedRole === r
                      ? r === 'ADMIN'
                        ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30 ring-1 ring-[#ef4444]/20'
                        : 'text-[#a5b4fc] bg-[#6366f1]/20 border-[#6366f1]/30 ring-1 ring-[#6366f1]/20'
                      : 'bg-[#f8fafc] text-[#94a3b8] border-[#e2e8f0] hover:text-[#64748b]'
                  }`}
                >
                  {r === 'ADMIN' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />} {r}
                </button>
              ))}
            </div>
          </div>

          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366f1] hover:bg-[#5558e3] text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Trial */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10b981]" /> Trial Yönetimi
            </h3>
            {user.trialPlan && user.trialEndsAt && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2.5 py-1 rounded-lg font-semibold">
                  {user.trialPlan} aktif — {Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))} gün kaldı
                </span>
                <button
                  onClick={handleCancelTrial}
                  disabled={settingTrial}
                  className="flex items-center gap-1 text-xs text-[#ef4444] hover:text-white bg-[#ef4444]/10 hover:bg-[#ef4444] border border-[#ef4444]/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  <X className="w-3 h-3" /> İptal et
                </button>
              </div>
            )}
          </div>

          {!user.trialPlan && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-[#94a3b8] mb-2 uppercase tracking-wider">Plan</label>
                <div className="flex gap-2">
                  {(['PRO', 'TEAM'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setTrialPlan(p)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        trialPlan === p
                          ? PLAN_COLORS[p] + ' ring-1 ring-[#6366f1]/40'
                          : 'bg-[#f8fafc] text-[#94a3b8] border-[#e2e8f0] hover:text-[#64748b]'
                      }`}
                    >
                      {PLAN_ICONS[p]} {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#94a3b8] mb-2 uppercase tracking-wider">Süre</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setTrialDays(d)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        trialDays === d
                          ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 ring-1 ring-[#10b981]/20'
                          : 'bg-[#f8fafc] text-[#94a3b8] border-[#e2e8f0] hover:text-[#64748b]'
                      }`}
                    >
                      {d} gün
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSetTrial}
                disabled={settingTrial}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/30 transition-colors disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                {settingTrial ? 'Başlatılıyor…' : `${trialDays} Günlük ${trialPlan} Trial Başlat`}
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[#f59e0b]" /> Support Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this user…"
            rows={5}
            className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors resize-none"
          />
          <button
            onClick={handleSave}
            disabled={saving || notes === (user.notes ?? '')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] border border-[#f59e0b]/30 transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Links */}
      {user.links.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#8b5cf6]" /> Links <span className="text-[#94a3b8] font-normal">({user.stats.totalLinks})</span>
            </h3>
          </div>
          <div className="divide-y divide-[#e2e8f0]/60">
            {user.links.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#e2e8f0]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0f172a] truncate max-w-[260px]">/{l.slug}</p>
                  <p className="text-[10px] text-[#94a3b8] truncate max-w-[260px]">{l.destination}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#64748b]">{l._count.clicks.toLocaleString()}</p>
                    <p className="text-[10px] text-[#94a3b8]">clicks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#64748b]">{l._count.conversions}</p>
                    <p className="text-[10px] text-[#94a3b8]">conv.</p>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] w-20 text-right">{new Date(l.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns */}
      {user.campaigns.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#ec4899]" /> Campaigns <span className="text-[#94a3b8] font-normal">({user.stats.totalCampaigns})</span>
            </h3>
          </div>
          <div className="divide-y divide-[#e2e8f0]/60">
            {user.campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#e2e8f0]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0f172a] truncate max-w-[260px]">{c.name}</p>
                  <p className="text-[10px] text-[#94a3b8]">{c.source}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    c.status === 'ACTIVE'
                      ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20'
                      : 'text-[#94a3b8] bg-[#e2e8f0] border-[#cbd5e1]'
                  }`}>{c.status}</span>
                  <p className="text-[10px] text-[#94a3b8] w-20 text-right">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
