'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Share2, Plus, Trash2, Pencil, X, Loader2, Search, AlertCircle, CheckCircle2, Eye, EyeOff, Copy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TrafficSource {
  id: string;
  name: string;
  platform: string;
  postbackUrl?: string;
  costModel: string;
  tags: string[];
  status: string;
  pixelId?: string | null;
  accessToken?: string | null;
  fbEventName?: string | null;
  createdAt: string;
  _count?: { campaigns: number };
}

const PLATFORM_META = {
  meta:   { icon: '📘', label: 'Meta Ads',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  google: { icon: '🔍', label: 'Google Ads',  color: 'text-green-600 bg-green-50 border-green-200' },
  tiktok: { icon: '🎵', label: 'TikTok Ads',  color: 'text-pink-600 bg-pink-50 border-pink-200' },
  native: { icon: '📰', label: 'Native',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  push:   { icon: '🔔', label: 'Push',        color: 'text-purple-600 bg-purple-50 border-purple-200' },
  other:  { icon: '🔗', label: 'Other',       color: 'text-[#64748b] bg-[#f1f5f9] border-[#e2e8f0]' },
};

const COST_MODELS = ['CPC', 'CPM', 'AUTO', 'FIXED'];
const FB_EVENTS = ['Purchase', 'Lead', 'CompleteRegistration', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Subscribe'];
const TOKENS = [
  '{clickid}', '{campaign.id}', '{campaign.name}',
  '{device}', '{os}', '{browser}', '{country}', '{city}', '{cost}', '{ip}',
];

const INITIAL_FORM = {
  name: '', platform: 'meta', postbackUrl: '', costModel: 'CPC', tags: '',
  pixelId: '', accessToken: '', fbEventName: 'Purchase',
};

export default function TrafficSourcesPage() {
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [editSource, setEditSource] = useState<TrafficSource | null>(null);
  const [editForm, setEditForm] = useState({ ...INITIAL_FORM });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [showEditToken, setShowEditToken] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await api.get<{ trafficSources: TrafficSource[] }>('/api/traffic-sources');
      setSources(res.trafficSources ?? []);
    } catch {
      toast({ type: 'error', title: 'Failed to load traffic sources' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const openEdit = (s: TrafficSource) => {
    setEditSource(s);
    setEditError('');
    setShowEditToken(false);
    setEditForm({
      name: s.name,
      platform: s.platform,
      postbackUrl: s.postbackUrl ?? '',
      costModel: s.costModel,
      tags: s.tags?.join(', ') ?? '',
      pixelId: s.pixelId ?? '',
      accessToken: s.accessToken ?? '',
      fbEventName: s.fbEventName ?? 'Purchase',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSource || editLoading) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.patch(`/api/traffic-sources/${editSource.id}`, {
        name: editForm.name,
        costModel: editForm.costModel,
        tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        ...(editForm.pixelId !== undefined && { pixelId: editForm.pixelId }),
        ...(editForm.accessToken && !editForm.accessToken.startsWith('••') && { accessToken: editForm.accessToken }),
        ...(editForm.fbEventName && { fbEventName: editForm.fbEventName }),
        ...(editForm.postbackUrl !== undefined && { postbackUrl: editForm.postbackUrl }),
      });
      toast({ type: 'success', title: 'Traffic source updated!' });
      setEditSource(null);
      fetchSources();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/traffic-sources', {
        name: form.name,
        platform: form.platform,
        postbackUrl: form.postbackUrl || undefined,
        costModel: form.costModel,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        pixelId: form.pixelId || undefined,
        accessToken: form.accessToken || undefined,
        fbEventName: form.fbEventName || undefined,
      });
      toast({ type: 'success', title: 'Traffic source created!', description: `"${form.name}" added.` });
      setShowModal(false);
      setForm(INITIAL_FORM);
      setShowToken(false);
      fetchSources();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/traffic-sources/${id}`);
      toast({ type: 'success', title: 'Deleted' });
      setSources((p) => p.filter((s) => s.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ type: 'success', title: `${label} copied!` });
  };

  const insertToken = (token: string) => {
    setForm((p) => ({ ...p, postbackUrl: p.postbackUrl + token }));
  };

  const filtered = sources.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Traffic Sources</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(INITIAL_FORM); setShowToken(false); }}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> New Source
        </button>
      </div>

      {sources.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text" placeholder="Search sources…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <Share2 className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">{search ? 'No sources found' : 'No traffic sources yet'}</p>
            <p className="text-sm text-[#94a3b8] max-w-xs">{search ? 'Try a different term' : 'Add your first traffic source to track campaigns and fire Meta CAPI events automatically.'}</p>
          </div>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add First Source
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((source) => {
            const meta = PLATFORM_META[source.platform as keyof typeof PLATFORM_META] ?? PLATFORM_META.other;
            const hasCapiConfig = source.platform === 'meta' && source.pixelId;
            return (
              <div key={source.id} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all duration-200 group relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {hasCapiConfig && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600">
                          <CheckCircle2 className="w-2.5 h-2.5" /> CAPI
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[#0f172a] truncate">{source.name}</h3>
                  </div>
                  <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openEdit(source)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-all flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(source.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#f8fafc] rounded-lg px-3 py-2">
                    <p className="text-[#94a3b8] mb-0.5">Cost Model</p>
                    <p className="font-semibold text-[#64748b]">{source.costModel}</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-lg px-3 py-2">
                    <p className="text-[#94a3b8] mb-0.5">Campaigns</p>
                    <p className="font-semibold text-[#0f172a]">{source._count?.campaigns ?? 0}</p>
                  </div>
                </div>

                {hasCapiConfig && (
                  <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                    <p className="text-[10px] text-[#94a3b8] mb-1">Pixel ID</p>
                    <p className="text-[10px] text-[#6366f1] font-mono">{source.pixelId}</p>
                    <p className="text-[10px] text-[#94a3b8] mt-1.5">Event → <span className="text-[#0f172a] font-medium">{source.fbEventName || 'Purchase'}</span></p>
                  </div>
                )}

                {source.tags && source.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {source.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#f1f5f9] text-[#94a3b8]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0] z-10">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Traffic Source</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Configure an ad network or traffic channel</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ef4444]">{formError}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Name *</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Meta Ads – Main"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Platform *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLATFORM_META).map(([key, val]) => (
                    <button
                      key={key} type="button"
                      onClick={() => setForm((p) => ({ ...p, platform: key }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.platform === key
                          ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1] hover:text-[#64748b]'
                      }`}
                    >
                      <span className="text-base">{val.icon}</span>
                      <span>{val.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Model */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Cost Model</label>
                <div className="flex gap-2">
                  {COST_MODELS.map((m) => (
                    <button
                      key={m} type="button"
                      onClick={() => setForm((p) => ({ ...p, costModel: m }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        form.costModel === m
                          ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Meta CAPI Section — shown only for Meta ── */}
              {form.platform === 'meta' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📘</span>
                    <div>
                      <p className="text-xs font-bold text-blue-700">Meta Conversions API (CAPI)</p>
                      <p className="text-[11px] text-blue-500 mt-0.5">Otomatik server-side pixel eventi — algoritma optimize eder</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1.5">
                      Pixel ID <span className="text-blue-400 font-normal">(Meta Events Manager&apos;dan)</span>
                    </label>
                    <input
                      type="text" value={form.pixelId}
                      onChange={(e) => setForm((p) => ({ ...p, pixelId: e.target.value }))}
                      placeholder="1234567890123456"
                      className="w-full bg-[#ffffff] border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 font-mono transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1.5">
                      Access Token <span className="text-blue-400 font-normal">(Events Manager → Conversions API → Token Oluştur)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'} value={form.accessToken}
                        onChange={(e) => setForm((p) => ({ ...p, accessToken: e.target.value }))}
                        placeholder="EAA…"
                        className="w-full bg-[#ffffff] border border-blue-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1.5">Conversion Event</label>
                    <select
                      value={form.fbEventName}
                      onChange={(e) => setForm((p) => ({ ...p, fbEventName: e.target.value }))}
                      className="w-full bg-[#ffffff] border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-colors"
                    >
                      {FB_EVENTS.map((ev) => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-blue-500 mt-1.5">
                      Postback gelince Meta&apos;ya otomatik &ldquo;{form.fbEventName}&rdquo; eventi gönderilecek.
                    </p>
                  </div>
                </div>
              )}

              {/* Postback URL */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">
                  Postback URL <span className="text-[#94a3b8]">(opsiyonel)</span>
                </label>
                <input
                  type="text" value={form.postbackUrl}
                  onChange={(e) => setForm((p) => ({ ...p, postbackUrl: e.target.value }))}
                  placeholder="https://tracker.example.com/postback?clickid={clickid}"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] font-mono focus:outline-none focus:border-[#6366f1] transition-colors"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {TOKENS.map((t) => (
                    <button
                      key={t} type="button" onClick={() => insertToken(t)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#e2e8f0] text-[#6366f1] hover:bg-[#6366f1]/20 transition-colors font-mono"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Tags <span className="text-[#94a3b8]">(virgülle ayrılmış)</span></label>
                <input
                  type="text" value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="retargeting, lookalike, brand"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Plus className="w-4 h-4" />Create Source</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditSource(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0] z-10">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Edit Traffic Source</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">{editSource.name}</p>
              </div>
              <button onClick={() => setEditSource(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">
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
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Cost Model</label>
                <div className="flex gap-2">
                  {COST_MODELS.map(m => (
                    <button key={m} type="button" onClick={() => setEditForm(p => ({ ...p, costModel: m }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${editForm.costModel === m ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {editForm.platform === 'meta' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-blue-700">Meta Conversions API (CAPI)</p>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Pixel ID</label>
                    <input type="text" value={editForm.pixelId} onChange={(e) => setEditForm(p => ({ ...p, pixelId: e.target.value }))}
                      placeholder="1305383161794857"
                      className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Access Token</label>
                    <div className="relative">
                      <input type={showEditToken ? 'text' : 'password'} value={editForm.accessToken}
                        onChange={(e) => setEditForm(p => ({ ...p, accessToken: e.target.value }))}
                        placeholder="Boş bırakırsan mevcut token korunur"
                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
                      <button type="button" onClick={() => setShowEditToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]">
                        {showEditToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-500 mt-1">Değiştirmek istemiyorsan boş bırak — mevcut token korunur</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Conversion Event</label>
                    <select value={editForm.fbEventName} onChange={(e) => setEditForm(p => ({ ...p, fbEventName: e.target.value }))}
                      className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                      {FB_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Tags (virgülle)</label>
                <input type="text" value={editForm.tags} onChange={(e) => setEditForm(p => ({ ...p, tags: e.target.value }))}
                  placeholder="meta, retargeting, brand"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditSource(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">İptal</button>
                <button type="submit" disabled={editLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />} Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#ef4444]" /></div>
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">Delete Traffic Source</h3>
                <p className="text-xs text-[#64748b]">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <p className="text-sm text-[#64748b] mb-5">Bu kaynağa bağlı kampanyalar kalır ama kaynak referansını kaybeder.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">İptal</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
