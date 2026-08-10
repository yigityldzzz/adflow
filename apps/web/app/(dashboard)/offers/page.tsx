'use client';

import { useEffect, useState, useCallback } from 'react';
import { Gift, Plus, Trash2, X, Loader2, Search, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Offer {
  id: string;
  name: string;
  url: string;
  countryLabel: string;
  affiliateNetwork?: string;
  tags: string[];
  payout: string;
  payoutValue?: number;
  currency: string;
  trackingMethod: string;
  status: string;
  createdAt: string;
}

const TRACKING_METHODS = ['S2S', 'Script', 'Pixel', 'Upload'];
const PAYOUT_TYPES = ['auto', 'manual'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY'];

const TOKENS = [
  '{clickid}', '{campaign.id}', '{campaign.name}', '{trafficsource.id}',
  '{offer.id}', '{offer.name}', '{country}', '{device}', '{cost}', '{externalid}',
];

const INITIAL_FORM = {
  name: '', url: '', countryLabel: 'Global', affiliateNetwork: '',
  tags: '', payout: 'auto', payoutValue: '', currency: 'USD', trackingMethod: 'S2S',
};

const METHOD_COLORS: Record<string, string> = {
  S2S:    'text-green-400 bg-green-500/10 border-green-500/20',
  Script: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Pixel:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Upload: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get<{ offers: Offer[] }>('/api/offers');
      setOffers(res.offers ?? []);
    } catch {
      toast({ type: 'error', title: 'Failed to load offers' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/offers', {
        name: form.name,
        url: form.url,
        countryLabel: form.countryLabel,
        affiliateNetwork: form.affiliateNetwork || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        payout: form.payout,
        payoutValue: form.payoutValue ? Number(form.payoutValue) : undefined,
        currency: form.currency,
        trackingMethod: form.trackingMethod,
      });
      toast({ type: 'success', title: 'Offer created!', description: `"${form.name}" added.` });
      setShowModal(false);
      setForm(INITIAL_FORM);
      fetchOffers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/offers/${id}`);
      toast({ type: 'success', title: 'Deleted' });
      setOffers((p) => p.filter((o) => o.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const insertToken = (token: string) => setForm((p) => ({ ...p, url: p.url + token }));

  const filtered = offers.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.affiliateNetwork ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Offers</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">{offers.length} offer{offers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(INITIAL_FORM); }}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> New Offer
        </button>
      </div>

      {offers.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text" placeholder="Search offers…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 h-40 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <Gift className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">{search ? 'No offers found' : 'No offers yet'}</p>
            <p className="text-sm text-[#94a3b8] max-w-xs">{search ? 'Try a different search' : 'Add your first offer to track conversions and revenue per offer URL.'}</p>
          </div>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add First Offer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((offer) => (
            <div key={offer.id} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all duration-200 group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${METHOD_COLORS[offer.trackingMethod] ?? METHOD_COLORS.S2S}`}>
                      {offer.trackingMethod}
                    </span>
                    <span className="text-xs text-[#94a3b8]">{offer.countryLabel}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a] truncate">{offer.name}</h3>
                  {offer.affiliateNetwork && (
                    <p className="text-xs text-[#94a3b8] mt-0.5">{offer.affiliateNetwork}</p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteId(offer.id)}
                  className="ml-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <a href={offer.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-[#6366f1] hover:text-[#818cf8] font-mono truncate mt-1 transition-colors">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {offer.url}
              </a>

              <div className="mt-3 pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">
                  {offer.payout === 'auto' ? 'Auto payout' : `${offer.currency} ${offer.payoutValue ?? '—'}`}
                </span>
                {offer.tags.length > 0 && (
                  <div className="flex gap-1">
                    {offer.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#e2e8f0] text-[#94a3b8]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Offer</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Add an offer URL with conversion tracking</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ef4444]">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Offer Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Global - Register" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Country Label</label>
                  <input type="text" value={form.countryLabel} onChange={(e) => setForm((p) => ({ ...p, countryLabel: e.target.value }))}
                    placeholder="Global" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Affiliate Network</label>
                  <input type="text" value={form.affiliateNetwork} onChange={(e) => setForm((p) => ({ ...p, affiliateNetwork: e.target.value }))}
                    placeholder="None" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Conversion Tracking Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {TRACKING_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setForm((p) => ({ ...p, trackingMethod: m }))}
                      className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${form.trackingMethod === m ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Offer URL *</label>
                <input type="text" required value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.com/register?click={clickid}"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] font-mono focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                <div className="mt-2 flex flex-wrap gap-1">
                  {TOKENS.map((t) => (
                    <button key={t} type="button" onClick={() => insertToken(t)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#e2e8f0] text-[#6366f1] hover:bg-[#6366f1]/20 transition-colors font-mono">{t}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Payout</label>
                  <div className="flex flex-col gap-1">
                    {PAYOUT_TYPES.map((pt) => (
                      <button key={pt} type="button" onClick={() => setForm((p) => ({ ...p, payout: pt }))}
                        className={`py-2 rounded-lg border text-xs font-semibold capitalize transition-all ${form.payout === pt ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Value</label>
                  <input type="number" min="0" step="0.01" value={form.payoutValue}
                    onChange={(e) => setForm((p) => ({ ...p, payoutValue: e.target.value }))}
                    disabled={form.payout === 'auto'} placeholder="0.00"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors disabled:opacity-40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Tags <span className="text-[#94a3b8]">(comma separated)</span></label>
                <input type="text" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="lead, register, purchase"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Plus className="w-4 h-4" />Save Offer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#ef4444]" /></div>
              <div><h3 className="text-sm font-bold text-[#0f172a]">Delete Offer</h3><p className="text-xs text-[#64748b]">This cannot be undone</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
