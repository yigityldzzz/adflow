'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  Pencil,
  BarChart2,
  X,
  Loader2,
  MousePointerClick,
  ExternalLink,
  Webhook,
  Search,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TrackingLink {
  id: string;
  name: string;
  slug: string;
  destinationUrl: string;
  campaignId?: string;
  campaign?: { id: string; name: string } | null;
  conversionToken?: string;
  createdAt: string;
  trackingUrl: string;
  postbackUrl: string;
  stats: { totalClicks: number; totalConversions: number; revenue: number };
}

interface Campaign {
  id: string;
  name: string;
}

const BASE_URL = 'https://adflow.digitaladexpert.de';

function truncateUrl(url: string, max = 45): string {
  if (url.length <= max) return url;
  return url.substring(0, max) + '…';
}

export default function LinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLink, setEditLink] = useState<TrackingLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPostbackId, setCopiedPostbackId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', destinationUrl: '', campaignId: '' });
  const [editForm, setEditForm] = useState({ name: '', destinationUrl: '', campaignId: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [editError, setEditError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [linksRes, campaignsRes] = await Promise.allSettled([
        api.get<{ links?: TrackingLink[] }>('/api/links'),
        api.get<{ campaigns?: Campaign[] }>('/api/campaigns'),
      ]);
      if (linksRes.status === 'fulfilled') {
        setLinks((linksRes.value as { links?: TrackingLink[] }).links ?? []);
      }
      if (campaignsRes.status === 'fulfilled') {
        setCampaigns((campaignsRes.value as { campaigns?: Campaign[] }).campaigns ?? []);
      }
    } catch {
      toast({ type: 'error', title: 'Failed to load links' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = async (text: string, id: string, type: 'link' | 'postback') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedPostbackId(id);
        setTimeout(() => setCopiedPostbackId(null), 2000);
      }
      toast({ type: 'success', title: 'Copied to clipboard!' });
    } catch {
      toast({ type: 'error', title: 'Failed to copy' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/links', {
        name: form.name,
        destinationUrl: form.destinationUrl,
        ...(form.campaignId ? { campaignId: form.campaignId } : {}),
      });
      toast({ type: 'success', title: 'Tracking link created!', description: `"${form.name}" is ready.` });
      setShowModal(false);
      setForm({ name: '', destinationUrl: '', campaignId: '' });
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (link: TrackingLink) => {
    setEditLink(link);
    setEditForm({ name: link.name, destinationUrl: link.destinationUrl, campaignId: link.campaign?.id ?? '' });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLink || editLoading) return;
    setEditError('');
    setEditLoading(true);
    try {
      await api.patch(`/api/links/${editLink.id}`, {
        name: editForm.name,
        destinationUrl: editForm.destinationUrl,
        ...(editForm.campaignId ? { campaignId: editForm.campaignId } : { campaignId: null }),
      });
      toast({ type: 'success', title: 'Link updated!' });
      setEditLink(null);
      fetchData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update link');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/links/${id}`);
      toast({ type: 'success', title: 'Link deleted' });
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = links.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.destinationUrl.toLowerCase().includes(search.toLowerCase())
  );

  const getPostbackUrl = (link: TrackingLink) =>
    `${BASE_URL}/postback/${link.conversionToken || link.id}?amount={amount}&currency={currency}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Tracking Links</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {links.length} link{links.length !== 1 ? 's' : ''} · Total {links.reduce((s, l) => s + (l.stats?.totalClicks || 0), 0).toLocaleString()} clicks
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm({ name: '', destinationUrl: '', campaignId: '' }); }}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New Link
        </button>
      </div>

      {/* Search */}
      {links.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search links…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 h-32 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <Link2 className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">
              {search ? 'No links found' : 'No tracking links yet'}
            </p>
            <p className="text-sm text-[#94a3b8] max-w-sm">
              {search
                ? 'Try a different search term'
                : 'Create tracking links to use in your Meta Ads campaigns. Each link captures full attribution data.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Link
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((link) => {
            const trackingUrl = link.trackingUrl || `${BASE_URL}/r/${link.slug}`;
            const postbackUrl = link.postbackUrl || getPostbackUrl(link);
            return (
              <div
                key={link.id}
                className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all duration-200 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Link info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-[#0f172a] truncate">{link.name}</h3>
                      {link.campaign?.name && (
                        <span className="flex-shrink-0 text-[10px] font-medium text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full border border-[#6366f1]/20">
                          {link.campaign.name}
                        </span>
                      )}
                    </div>

                    {/* Tracking URL */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 min-w-0">
                        <ArrowUpRight className="w-3 h-3 text-[#6366f1] flex-shrink-0" />
                        <span className="text-xs font-mono text-[#818cf8] truncate">{trackingUrl}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(trackingUrl, link.id, 'link')}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#6366f1] bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#6366f1]/30 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-3.5 h-3.5 text-[#10b981]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedId === link.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{truncateUrl(link.destinationUrl)}</span>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Click count */}
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-[#94a3b8] mb-0.5">
                        <MousePointerClick className="w-3 h-3" />
                        <span className="text-[10px] uppercase tracking-wide">Clicks</span>
                      </div>
                      <p className="text-sm font-bold text-[#0f172a]">{link.stats?.totalClicks?.toLocaleString() ?? '0'}</p>
                    </div>

                    {/* Postback button */}
                    <button
                      onClick={() => copyToClipboard(postbackUrl, link.id, 'postback')}
                      className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#8b5cf6] bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#8b5cf6]/30 px-3 py-2 rounded-lg transition-all"
                    >
                      {copiedPostbackId === link.id ? (
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <Webhook className="w-3.5 h-3.5" />
                      )}
                      {copiedPostbackId === link.id ? 'Copied!' : 'Postback'}
                    </button>

                    {/* Stats */}
                    <button
                      onClick={() => router.push(`/links/${link.id}`)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-all"
                      title="View click details"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(link)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all"
                      title="Edit link"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteId(link.id)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Postback URL preview */}
                <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                    <Webhook className="w-3 h-3 text-[#8b5cf6]/60" />
                    <span className="font-mono truncate">{truncateUrl(postbackUrl, 80)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Link Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Tracking Link</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Create a new link for your campaign</p>
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
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Link Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Summer Sale - Homepage"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={form.destinationUrl}
                  onChange={(e) => setForm((p) => ({ ...p, destinationUrl: e.target.value }))}
                  placeholder="https://yoursite.com/landing-page"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Campaign (optional)</label>
                <select
                  value={form.campaignId}
                  onChange={(e) => setForm((p) => ({ ...p, campaignId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors appearance-none"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
                <p className="text-xs text-[#94a3b8] mb-1">Your tracking link will be:</p>
                <p className="text-xs font-mono text-[#6366f1]">{BASE_URL}/r/[auto-generated-slug]</p>
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
                      <Link2 className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Link Modal */}
      {editLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditLink(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Edit Link</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">/r/{editLink.slug}</p>
              </div>
              <button onClick={() => setEditLink(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#ef4444]">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Link Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={editForm.destinationUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, destinationUrl: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Campaign (optional)</label>
                <select
                  value={editForm.campaignId}
                  onChange={(e) => setEditForm((p) => ({ ...p, campaignId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors appearance-none"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditLink(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
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
                <h3 className="text-sm font-bold text-[#0f172a]">Delete Link</h3>
                <p className="text-xs text-[#64748b]">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[#64748b] mb-5">
              The tracking link will stop working immediately. Historical click data will be preserved.
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
