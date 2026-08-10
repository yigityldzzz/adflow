'use client';

import { useState, useCallback } from 'react';
import {
  Link2,
  Copy,
  Check,
  Plus,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

const PRESETS = {
  meta: {
    label: 'Meta Ads',
    color: 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20',
    fields: { source: 'facebook', medium: 'paid_social', content: '{{ad.id}}' },
  },
  google: {
    label: 'Google Ads',
    color: 'bg-[#34A853]/10 text-[#34A853] border-[#34A853]/20',
    fields: { source: 'google', medium: 'cpc', content: '{creative}' },
  },
  tiktok: {
    label: 'TikTok Ads',
    color: 'bg-[#ff0050]/10 text-[#ff0050] border-[#ff0050]/20',
    fields: { source: 'tiktok', medium: 'paid_social', content: '{{ad_id}}' },
  },
  email: {
    label: 'Email',
    color: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
    fields: { source: 'newsletter', medium: 'email', content: '' },
  },
} as const;

type PresetKey = keyof typeof PRESETS;

interface Campaign { id: string; name: string; }

function buildUrl(base: string, params: Record<string, string>): string {
  if (!base) return '';
  try {
    const url = new URL(base.startsWith('http') ? base : `https://${base}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    return url.toString();
  } catch {
    return base;
  }
}

export default function UtmBuilderPage() {
  const [form, setForm] = useState({
    destinationUrl: '',
    campaignName: '',
    source: '',
    medium: '',
    content: '',
    term: '',
    linkName: '',
    campaignId: '',
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');

  const loadCampaigns = useCallback(async () => {
    if (campaignsLoaded) return;
    try {
      const res = await api.get<{ campaigns: Campaign[] }>('/api/campaigns');
      setCampaigns((res as { campaigns: Campaign[] }).campaigns ?? []);
      setCampaignsLoaded(true);
    } catch { /* ignore */ }
  }, [campaignsLoaded]);

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS[key];
    setForm((f) => ({ ...f, ...p.fields }));
  };

  const utmParams = {
    utm_source: form.source,
    utm_medium: form.medium,
    utm_campaign: form.campaignName,
    utm_content: form.content,
    utm_term: form.term,
  };

  const finalUrl = buildUrl(form.destinationUrl, Object.fromEntries(
    Object.entries(utmParams).filter(([, v]) => v)
  ));

  const handleCopy = async () => {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ type: 'success', title: 'URL copied!' });
  };

  const handleCreateLink = async () => {
    if (!finalUrl || creating) return;
    setCreating(true);
    try {
      const res = await api.post<{ link: { trackingUrl: string } }>('/api/links', {
        name: form.linkName || `${form.source || 'link'} — ${form.campaignName || 'campaign'}`,
        destinationUrl: finalUrl,
        ...(form.campaignId ? { campaignId: form.campaignId } : {}),
      });
      const trackingUrl = (res as { link: { trackingUrl: string } }).link?.trackingUrl ?? '';
      setCreatedUrl(trackingUrl);
      toast({ type: 'success', title: 'Tracking link created!', description: trackingUrl });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to create link', description: err instanceof Error ? err.message : undefined });
    } finally {
      setCreating(false);
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, required = false) => (
    <div>
      <label className="block text-xs font-medium text-[#64748b] mb-1.5">
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      <input
        type={key === 'destinationUrl' ? 'url' : 'text'}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f172a]">UTM Builder</h2>
        <p className="text-sm text-[#94a3b8] mt-0.5">Build tracking URLs for Meta, Google, TikTok and email campaigns</p>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(PRESETS) as [PresetKey, typeof PRESETS[PresetKey]][]).map(([key, p]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={`flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.02] ${p.color}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-1">Parameters</h3>

          {field('destinationUrl', 'Destination URL', 'https://yoursite.com/landing', true)}

          <div className="grid grid-cols-2 gap-3">
            {field('source', 'UTM Source', 'facebook')}
            {field('medium', 'UTM Medium', 'paid_social')}
          </div>

          {field('campaignName', 'UTM Campaign', 'summer_sale_2026')}

          <div className="grid grid-cols-2 gap-3">
            {field('content', 'UTM Content', '{{ad.id}}')}
            {field('term', 'UTM Term', 'keyword (optional)')}
          </div>

          <div className="border-t border-[#e2e8f0] pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Save as Tracking Link</h4>
            {field('linkName', 'Link Name', 'Meta — Summer Sale')}

            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Campaign (optional)</label>
              <div className="relative">
                <select
                  value={form.campaignId}
                  onChange={(e) => setForm((p) => ({ ...p, campaignId: e.target.value }))}
                  onFocus={loadCampaigns}
                  className="w-full appearance-none bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview + Output */}
        <div className="space-y-4">
          {/* UTM Preview */}
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Preview URL</h3>
            {finalUrl ? (
              <div className="space-y-2">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
                  <p className="text-xs font-mono text-[#818cf8] break-all leading-relaxed">{finalUrl}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] hover:border-[#6366f1]/40 rounded-xl py-2 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            ) : (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-center">
                <ExternalLink className="w-6 h-6 text-[#e2e8f0] mx-auto mb-2" />
                <p className="text-xs text-[#94a3b8]">Enter a destination URL to preview</p>
              </div>
            )}
          </div>

          {/* UTM params breakdown */}
          {Object.values(utmParams).some(Boolean) && (
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Parameters</h3>
              <div className="space-y-2">
                {Object.entries(utmParams).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded w-32 flex-shrink-0">{k}</span>
                    <span className="text-xs text-[#64748b] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create tracking link button */}
          <button
            onClick={handleCreateLink}
            disabled={!finalUrl || creating}
            className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'Creating…' : 'Create Tracking Link'}
          </button>

          {/* Created link result */}
          {createdUrl && (
            <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-[#10b981]" />
                <p className="text-xs font-semibold text-[#10b981]">Tracking link created!</p>
              </div>
              <p className="text-xs font-mono text-[#34d399] break-all mb-2">{createdUrl}</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(createdUrl);
                  toast({ type: 'success', title: 'Tracking URL copied!' });
                }}
                className="text-xs text-[#10b981] hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy tracking URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
