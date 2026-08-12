'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Plus, Trash2, X, Loader2, CheckCircle2, Clock, Copy, Check, RefreshCw, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  live: boolean;
  verificationToken: string;
  createdAt: string;
  verifiedAt: string | null;
}

interface DnsInstructions {
  verification: { type: string; host: string; value: string };
  routing: { type: string; host: string; value: string; note: string };
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdInstructions, setCreatedInstructions] = useState<DnsInstructions | null>(null);
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await api.get<{ domains: Domain[] }>('/api/domains');
      setDomains(res.domains);
    } catch {
      toast({ type: 'error', title: 'Failed to load domains' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim() || creating) return;
    setError('');
    setCreating(true);
    try {
      const res = await api.post<{ dnsInstructions: DnsInstructions }>('/api/domains', { domain: newDomain.trim() });
      setCreatedInstructions(res.dnsInstructions);
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setCreating(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const res = await api.post<{ verified: boolean; error?: string }>(`/api/domains/${id}/verify`, {});
      if (res.verified) {
        toast({ type: 'success', title: 'Domain verified!', description: 'We\'ll notify you once traffic routing is activated.' });
        fetchDomains();
      } else {
        toast({ type: 'error', title: 'Not verified yet', description: res.error ?? 'DNS record not found yet.' });
      }
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this domain? Links using it will fall back to the default AdFlow domain.')) return;
    try {
      await api.delete(`/api/domains/${id}`);
      toast({ type: 'success', title: 'Domain removed' });
      fetchDomains();
    } catch {
      toast({ type: 'error', title: 'Failed to remove domain' });
    }
  }

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function closeModal() {
    setShowModal(false);
    setNewDomain('');
    setCreatedInstructions(null);
    setError('');
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-40 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Custom Domains</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Use your own domain instead of adflow.digitaladexpert.de in tracking links.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e2e8f0] flex items-center justify-center">
              <Globe className="w-7 h-7 text-[#94a3b8]" />
            </div>
            <p className="text-sm text-[#94a3b8]">No custom domains yet — links use adflow.digitaladexpert.de by default.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                <Globe className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a] font-mono truncate">{d.domain}</p>
                  <p className="text-xs text-[#94a3b8]">Added {new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
                {d.live ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-full border border-[#10b981]/20">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                ) : d.verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-1 rounded-full border border-[#f59e0b]/20">
                    <Clock className="w-3 h-3" /> Verified — activation pending
                  </span>
                ) : (
                  <button
                    onClick={() => handleVerify(d.id)}
                    disabled={verifyingId === d.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#6366f1]/40 hover:text-[#6366f1] px-2.5 py-1.5 rounded-full transition-colors"
                  >
                    {verifyingId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Check DNS
                  </button>
                )}
                <button onClick={() => handleDelete(d.id)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {domains.some((d) => d.verified && !d.live) && (
        <div className="flex items-start gap-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#92620a] leading-relaxed">
            DNS-verified domains need one manual activation step on our infrastructure before they start routing real traffic —
            this protects the other sites hosted on the same server. We&apos;ll notify you once it&apos;s live, usually within a day of verification.
          </p>
        </div>
      )}

      {/* Add domain modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#0f172a]">Add Custom Domain</h3>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!createdInstructions ? (
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                    <p className="text-sm text-[#ef4444]">{error}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Domain</label>
                  <input
                    type="text" required value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="track.yourcompany.com"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] font-mono placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                  <p className="text-[11px] text-[#94a3b8] mt-1.5">Use a subdomain you own, e.g. track.yourcompany.com — not your main website.</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Domain
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl">
                  <p className="text-sm font-semibold text-[#0f172a] mb-1">Add these DNS records</p>
                  <p className="text-xs text-[#64748b]">At your domain registrar or Cloudflare DNS settings.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">1. Ownership verification</p>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8]">Type</span>
                      <span className="text-[#0f172a]">{createdInstructions.verification.type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8] flex-shrink-0">Host</span>
                      <span className="text-[#0f172a] truncate">{createdInstructions.verification.host}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8] flex-shrink-0">Value</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#6366f1] truncate">{createdInstructions.verification.value}</span>
                        <button onClick={() => copy(createdInstructions.verification.value, 'txt')} className="flex-shrink-0 text-[#94a3b8] hover:text-[#6366f1]">
                          {copiedField === 'txt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">2. Traffic routing</p>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8]">Type</span>
                      <span className="text-[#0f172a]">{createdInstructions.routing.type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8] flex-shrink-0">Host</span>
                      <span className="text-[#0f172a] truncate">{createdInstructions.routing.host}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#94a3b8] flex-shrink-0">Value</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#6366f1] truncate">{createdInstructions.routing.value}</span>
                        <button onClick={() => copy(createdInstructions.routing.value, 'cname')} className="flex-shrink-0 text-[#94a3b8] hover:text-[#6366f1]">
                          {copiedField === 'cname' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{createdInstructions.routing.note}</p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  Done — I&apos;ll add the DNS records
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
