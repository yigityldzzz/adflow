'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  TrendingUp,
  MousePointerClick,
  Target,
  Search,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface CampaignStats {
  totalClicks: number;
  totalConversions: number;
  revenue: number;
  roas: number | null;
  ctr: number;
}

interface Flow {
  id: string;
  name: string;
  status: string;
}

interface TrafficSource { id: string; name: string; platform: string; }

interface Campaign {
  id: string;
  name: string;
  description?: string;
  source: string;
  status: 'active' | 'paused' | 'archived';
  budget?: number;
  cost?: number;
  trafficSourceId?: string;
  trafficSource?: { id: string; name: string; platform: string } | null;
  flowId?: string;
  flow?: { id: string; name: string } | null;
  stats?: CampaignStats;
  createdAt: string;
}

const SOURCE_ICONS: Record<string, string> = {
  meta: '📘',
  google: '🔍',
  tiktok: '🎵',
  other: '🔗',
};

const SOURCE_COLORS: Record<string, string> = {
  meta: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  google: 'text-green-400 bg-green-500/10 border-green-500/20',
  tiktok: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  other: 'text-[#64748b] bg-[#e2e8f0] border-[#e2e8f0]',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20',
  paused: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  archived: 'text-[#94a3b8] bg-[#e2e8f0] border-[#e2e8f0]',
};

const INITIAL_FORM = {
  name: '',
  source: 'meta',
  description: '',
  budget: '',
  cost: '',
  trafficSourceId: '',
  flowId: '',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', budget: '', cost: '', trafficSourceId: '', flowId: '', status: 'ACTIVE' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const [res, srcRes] = await Promise.all([
        api.get<{ campaigns?: Campaign[] } | Campaign[]>('/api/campaigns'),
        api.get<{ trafficSources: TrafficSource[] }>('/api/traffic-sources'),
      ]);
      const v = res as { campaigns?: Campaign[] } & Campaign[];
      setCampaigns(v.campaigns ?? (Array.isArray(v) ? v : []));
      setTrafficSources(srcRes.trafficSources ?? []);
      const flowRes = await api.get<{ flows: Flow[] }>('/api/flows');
      setFlows(flowRes.flows ?? []);
    } catch {
      toast({ type: 'error', title: 'Failed to load campaigns' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/campaigns', {
        name: form.name,
        source: form.source,
        description: form.description || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        trafficSourceId: form.trafficSourceId || undefined,
        flowId: form.flowId || undefined,
      });
      toast({ type: 'success', title: 'Campaign created!', description: `"${form.name}" is now live.` });
      setShowModal(false);
      setForm(INITIAL_FORM);
      fetchCampaigns();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/campaigns/${id}`);
      toast({ type: 'success', title: 'Campaign deleted' });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (camp: Campaign) => {
    setEditCampaign(camp);
    setEditError('');
    setEditForm({
      name: camp.name,
      description: camp.description ?? '',
      budget: camp.budget ? String(camp.budget) : '',
      cost: camp.cost ? String(camp.cost) : '',
      trafficSourceId: camp.trafficSourceId ?? '',
      flowId: camp.flowId ?? '',
      status: camp.status,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCampaign || editLoading) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.patch(`/api/campaigns/${editCampaign.id}`, {
        name: editForm.name,
        description: editForm.description || undefined,
        budget: editForm.budget ? parseFloat(editForm.budget) : undefined,
        cost: editForm.cost ? parseFloat(editForm.cost) : undefined,
        trafficSourceId: editForm.trafficSourceId || undefined,
        flowId: editForm.flowId || undefined,
        status: editForm.status,
      });
      toast({ type: 'success', title: 'Campaign updated!' });
      setEditCampaign(null);
      fetchCampaigns();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Campaigns</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(INITIAL_FORM); }}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Search */}
      {campaigns.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 h-48 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <Megaphone className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">
              {search ? 'No campaigns found' : 'No campaigns yet'}
            </p>
            <p className="text-sm text-[#94a3b8] max-w-xs">
              {search
                ? 'Try a different search term'
                : 'Create your first campaign to start tracking Meta Ads performance.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all duration-200 group relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg border capitalize ${SOURCE_COLORS[campaign.source] || SOURCE_COLORS.other}`}
                    >
                      {SOURCE_ICONS[campaign.source] || '🔗'} {campaign.source}
                    </span>
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border capitalize ${STATUS_STYLES[campaign.status] || STATUS_STYLES.active}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a] truncate">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-2">{campaign.description}</p>
                  )}
                  {campaign.trafficSource && (
                    <p className="text-[10px] text-[#6366f1] mt-0.5">↳ {campaign.trafficSource.name}</p>
                  )}
                  {campaign.flow && (
                    <p className="text-[10px] text-green-600 mt-0.5">⚡ Flow: {campaign.flow.name}</p>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={() => openEdit(campaign)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(campaign.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#e2e8f0]">
                <div>
                  <div className="flex items-center gap-1 text-[#94a3b8] mb-1">
                    <MousePointerClick className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide">Clicks</span>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a]">
                    {campaign.stats?.totalClicks?.toLocaleString() ?? '0'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#94a3b8] mb-1">
                    <Target className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide">Conv.</span>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a]">
                    {campaign.stats?.totalConversions?.toLocaleString() ?? '0'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#94a3b8] mb-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide">ROAS</span>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a]">
                    {campaign.stats?.roas ? `${campaign.stats.roas.toFixed(2)}x` : '—'}
                  </p>
                </div>
              </div>

              {(campaign.budget || campaign.cost) && (
                <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-1.5">
                  {campaign.budget && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94a3b8]">Budget</span>
                      <span className="text-xs font-semibold text-[#64748b]">${campaign.budget.toLocaleString()}/mo</span>
                    </div>
                  )}
                  {campaign.cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94a3b8]">Ad Spend</span>
                      <span className="text-xs font-semibold text-[#ef4444]">${campaign.cost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-[#94a3b8] mt-3">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Campaign</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Set up a new ad campaign to track</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#ef4444]">{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Summer Sale 2026"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Traffic Source *</label>
                <div className="grid grid-cols-4 gap-2">
                  {['meta', 'google', 'tiktok', 'other'].map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, source: src }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.source === src
                          ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1] hover:text-[#64748b]'
                      }`}
                    >
                      <span className="text-base">{SOURCE_ICONS[src]}</span>
                      <span className="capitalize">{src}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional campaign description…"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Link Traffic Source <span className="text-[#94a3b8]">(optional)</span></label>
                <select
                  value={form.trafficSourceId}
                  onChange={(e) => setForm((p) => ({ ...p, trafficSourceId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                >
                  <option value="">— None —</option>
                  {trafficSources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Flow <span className="text-[#94a3b8]">(opsiyonel — Lander/Offer routing)</span></label>
                <select
                  value={form.flowId}
                  onChange={(e) => setForm((p) => ({ ...p, flowId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                >
                  <option value="">— Flow Yok —</option>
                  {flows.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Monthly Budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.budget}
                    onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-7 pr-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Total Ad Spend (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-[#94a3b8] mt-1">Used to calculate Profit & ROI on dashboard</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {/* Edit Modal */}
      {editCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditCampaign(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0] z-10">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Edit Campaign</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">{editCampaign.name}</p>
              </div>
              <button onClick={() => setEditCampaign(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ef4444]">{editError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Name *</label>
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Status</label>
                <div className="flex gap-2">
                  {['ACTIVE', 'PAUSED', 'ARCHIVED'].map((s) => (
                    <button key={s} type="button" onClick={() => setEditForm((p) => ({ ...p, status: s }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${editForm.status === s ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Budget (USD)</label>
                  <input type="number" min="0" value={editForm.budget} onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))}
                    placeholder="0" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Ad Spend (USD)</label>
                  <input type="number" min="0" value={editForm.cost} onChange={(e) => setEditForm((p) => ({ ...p, cost: e.target.value }))}
                    placeholder="0" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Traffic Source</label>
                <select value={editForm.trafficSourceId} onChange={(e) => setEditForm((p) => ({ ...p, trafficSourceId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                  <option value="">— None —</option>
                  {trafficSources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Flow</label>
                <select value={editForm.flowId} onChange={(e) => setEditForm((p) => ({ ...p, flowId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                  <option value="">— None —</option>
                  {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description</label>
                <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditCampaign(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">İptal</button>
                <button type="submit" disabled={editLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />} Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[#ef4444]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">Delete Campaign</h3>
                <p className="text-xs text-[#64748b]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[#64748b] mb-5">
              All associated tracking links and click data will remain, but the campaign will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
