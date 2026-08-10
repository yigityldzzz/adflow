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
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan?: string;
  createdAt?: string;
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
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'api' | 'notifications'>('profile');

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
