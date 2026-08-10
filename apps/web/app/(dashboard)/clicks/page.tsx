'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MousePointerClick, RefreshCw, Search, Filter, Globe, Monitor,
  Smartphone, Tablet, ChevronLeft, ChevronRight, ShoppingCart,
  CheckCircle2, XCircle, Bot, User, Wifi,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Click {
  id: string;
  timestamp: string;
  ip: string | null;
  visitorId: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  fbclid: string | null;
  isBot: boolean;
  isSuspicious: boolean;
  isUnique: boolean;
  link: { name: string; slug: string } | null;
  campaign: { name: string } | null;
  conversions: { id: string; type: string; value: number }[];
}

interface Campaign { id: string; name: string; }

const DEVICE_ICON: Record<string, React.ReactNode> = {
  mobile:  <Smartphone className="w-3.5 h-3.5" />,
  desktop: <Monitor className="w-3.5 h-3.5" />,
  tablet:  <Tablet className="w-3.5 h-3.5" />,
};

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ClickLogPage() {
  const [clicks, setClicks]       = useState<Click[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // filters
  const [search, setSearch]         = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [device, setDevice]         = useState('');
  const [isBot, setIsBot]           = useState('');
  const [isUnique, setIsUnique]     = useState('');
  const [preset, setPreset]         = useState('today');
  const [page, setPage]             = useState(0);
  const limit = 50;

  const fetchClicks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        preset,
      });
      if (search)     params.set('search',     search);
      if (campaignId) params.set('campaignId', campaignId);
      if (device)     params.set('device',     device);
      if (isBot)      params.set('isBot',      isBot);
      if (isUnique)   params.set('isUnique',   isUnique);

      const res = await api.get<{ clicks: Click[]; total: number }>(`/api/analytics/recent-clicks?${params}`);
      setClicks(res.clicks ?? []);
      setTotal(res.total ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, campaignId, device, isBot, isUnique, preset, page]);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  useEffect(() => {
    api.get<{ campaigns: Campaign[] }>('/api/campaigns').then(r => setCampaigns(r.campaigns ?? [])).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / limit);

  const filterChanged = () => { setPage(0); };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Click Log</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {total.toLocaleString()} tıklama bulundu
          </p>
        </div>
        <button
          onClick={() => fetchClicks(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-4">
        <div className="flex flex-wrap gap-3">
          {/* Date preset */}
          <select
            value={preset}
            onChange={e => { setPreset(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="today">Bugün</option>
            <option value="yesterday">Dün</option>
            <option value="last7">Son 7 gün</option>
            <option value="last30">Son 30 gün</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="IP, Visitor ID, UTM, fbclid..."
              value={search}
              onChange={e => { setSearch(e.target.value); filterChanged(); }}
              className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
            />
          </div>

          {/* Campaign */}
          <select
            value={campaignId}
            onChange={e => { setCampaignId(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="">Tüm Kampanyalar</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Device */}
          <select
            value={device}
            onChange={e => { setDevice(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="">Tüm Cihazlar</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>

          {/* Bot filter */}
          <select
            value={isBot}
            onChange={e => { setIsBot(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="">Bot + İnsan</option>
            <option value="false">Sadece İnsan</option>
            <option value="true">Sadece Bot</option>
          </select>

          {/* Unique filter */}
          <select
            value={isUnique}
            onChange={e => { setIsUnique(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="">Tüm Tıklamalar</option>
            <option value="true">Sadece Unique</option>
            <option value="false">Sadece Tekrar</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 border-b border-[#f1f5f9] skeleton" />
            ))}
          </div>
        ) : clicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MousePointerClick className="w-10 h-10 text-[#e2e8f0]" />
            <p className="text-sm text-[#94a3b8]">Bu filtrelerle tıklama bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8] whitespace-nowrap">Zaman</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Kampanya / Link</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Ülke</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Cihaz / OS</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Kaynak</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Durum</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Dönüşüm</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((click, i) => (
                  <tr
                    key={click.id}
                    className={`border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors ${click.isBot ? 'opacity-50' : ''}`}
                  >
                    {/* Time */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#64748b] font-mono">
                      {fmt(click.timestamp)}
                    </td>

                    {/* Campaign / Link */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0f172a] truncate max-w-[140px]">
                        {click.campaign?.name ?? <span className="text-[#94a3b8]">—</span>}
                      </p>
                      <p className="text-[#94a3b8] truncate max-w-[140px]">
                        {click.link?.name ?? click.link?.slug ?? '—'}
                      </p>
                    </td>

                    {/* Country */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-[#94a3b8]" />
                        <span className="text-[#64748b]">
                          {click.country ?? '—'}
                          {click.city ? `, ${click.city}` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Device / OS */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[#64748b]">
                        {DEVICE_ICON[click.device ?? ''] ?? <Monitor className="w-3.5 h-3.5 text-[#cbd5e1]" />}
                        <span>{click.device ?? '—'}</span>
                        {click.os && <span className="text-[#94a3b8]">/ {click.os}</span>}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="text-[#64748b]">{click.utmSource ?? '(direct)'}</span>
                      {click.fbclid && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-600 font-semibold">
                          fb
                        </span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 font-mono text-[#94a3b8] whitespace-nowrap">
                      {click.ip ?? '—'}
                    </td>

                    {/* Status badges */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {click.isBot ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-600 font-semibold">
                            <Bot className="w-2.5 h-2.5" /> Bot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 border border-green-200 rounded text-[10px] text-green-600 font-semibold">
                            <User className="w-2.5 h-2.5" /> Human
                          </span>
                        )}
                        {click.isUnique ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-600 font-semibold">
                            <Wifi className="w-2.5 h-2.5" /> Unique
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[10px] text-[#94a3b8]">
                            Tekrar
                          </span>
                        )}
                        {click.isSuspicious && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 border border-orange-200 rounded text-[10px] text-orange-600 font-semibold">
                            ⚠ Şüpheli
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Conversions */}
                    <td className="px-4 py-3">
                      {click.conversions.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {click.conversions.map(cv => (
                            <span key={cv.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded text-[10px] text-[#10b981] font-semibold">
                              <ShoppingCart className="w-2.5 h-2.5" />
                              {cv.type} ${cv.value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#e2e8f0]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f5f9]">
            <p className="text-xs text-[#94a3b8]">
              {page * limit + 1}–{Math.min((page + 1) * limit, total)} / {total.toLocaleString()} tıklama
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center px-3 text-xs text-[#64748b]">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
