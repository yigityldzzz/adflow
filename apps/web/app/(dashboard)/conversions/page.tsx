'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Target, DollarSign, TrendingUp, ShoppingCart, UserCheck, UserPlus,
  Zap, HelpCircle, Globe, Monitor, Smartphone, Tablet, RefreshCw,
  Search, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Conversion {
  id: string;
  type: string;
  value: number;
  currency: string;
  timestamp: string;
  txid: string | null;
  link: { name: string; slug: string; campaignId: string | null; campaign: { name: string } | null } | null;
  click: {
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
    ip: string | null;
    visitorId: string | null;
  } | null;
}

interface Summary { revenue: number; count: number; avg: number; }
interface Campaign { id: string; name: string; }

const TYPE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PURCHASE:    { label: 'Purchase',    color: 'text-[#10b981]', bg: 'bg-[#10b981]/10 border-[#10b981]/20', icon: <ShoppingCart className="w-3 h-3" /> },
  LEAD:        { label: 'Lead',        color: 'text-[#6366f1]', bg: 'bg-[#6366f1]/10 border-[#6366f1]/20', icon: <UserCheck className="w-3 h-3" /> },
  SIGNUP:      { label: 'Signup',      color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10 border-[#8b5cf6]/20', icon: <UserPlus className="w-3 h-3" /> },
  ADD_TO_CART: { label: 'Add to Cart', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/20', icon: <Zap className="w-3 h-3" /> },
  CUSTOM:      { label: 'Custom',      color: 'text-[#64748b]', bg: 'bg-[#64748b]/10 border-[#64748b]/20', icon: <HelpCircle className="w-3 h-3" /> },
};

const DEVICE_ICON: Record<string, React.ReactNode> = {
  mobile:  <Smartphone className="w-3.5 h-3.5" />,
  desktop: <Monitor className="w-3.5 h-3.5" />,
  tablet:  <Tablet className="w-3.5 h-3.5" />,
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function money(v: number, c = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(v);
}

const LIMIT = 50;

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [summary, setSummary]         = useState<Summary>({ revenue: 0, count: 0, avg: 0 });
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);

  const [preset, setPreset]         = useState('last30');
  const [search, setSearch]         = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]             = useState(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT), preset });
      if (search)     params.set('search',     search);
      if (campaignId) params.set('campaignId', campaignId);
      if (typeFilter) params.set('type',       typeFilter);

      const res = await api.get<{ conversions: Conversion[]; total: number; summary: Summary }>(`/api/conversions?${params}`);
      setConversions(res.conversions ?? []);
      setTotal(res.total ?? 0);
      setSummary(res.summary ?? { revenue: 0, count: 0, avg: 0 });
    } catch {
      toast({ type: 'error', title: 'Yüklenemedi' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, search, campaignId, typeFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get<{ campaigns: Campaign[] }>('/api/campaigns').then(r => setCampaigns(r.campaigns ?? [])).catch(() => {});
  }, []);

  const filterChanged = () => setPage(0);

  const exportCSV = () => {
    const headers = ['Zaman', 'Tip', 'Değer', 'Para Birimi', 'Kampanya', 'Link', 'txid', 'Ülke', 'Şehir', 'Cihaz', 'OS', 'Kaynak', 'fbclid', 'IP', 'Visitor ID'];
    const rows = conversions.map(c => [
      fmt(c.timestamp),
      c.type,
      c.value,
      c.currency,
      c.link?.campaign?.name ?? '',
      c.link?.name ?? '',
      c.txid ?? '',
      c.click?.country ?? '',
      c.click?.city ?? '',
      c.click?.device ?? '',
      c.click?.os ?? '',
      c.click?.utmSource ?? '',
      c.click?.fbclid ?? '',
      c.click?.ip ?? '',
      c.click?.visitorId ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `conversions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Conversion Log</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">{total.toLocaleString()} dönüşüm bulundu</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => fetchData(true)} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#10b981] rounded-2xl p-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1">Toplam Gelir</p>
          <p className="text-2xl font-bold text-[#0f172a]">{money(summary.revenue)}</p>
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#6366f1] rounded-2xl p-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1">Dönüşüm Sayısı</p>
          <p className="text-2xl font-bold text-[#0f172a]">{summary.count.toLocaleString()}</p>
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#f59e0b] rounded-2xl p-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1">Ortalama Değer</p>
          <p className="text-2xl font-bold text-[#0f172a]">{money(summary.avg)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-4">
        <div className="flex flex-wrap gap-3">
          <select value={preset} onChange={e => { setPreset(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
            <option value="all">Tüm Zamanlar</option>
            <option value="today">Bugün</option>
            <option value="yesterday">Dün</option>
            <option value="last7">Son 7 gün</option>
            <option value="last30">Son 30 gün</option>
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input type="text" placeholder="txid, link adı..." value={search}
              onChange={e => { setSearch(e.target.value); filterChanged(); }}
              className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]" />
          </div>

          <select value={campaignId} onChange={e => { setCampaignId(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
            <option value="">Tüm Kampanyalar</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); filterChanged(); }}
            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
            <option value="">Tüm Tipler</option>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {loading ? (
          <div>{[...Array(8)].map((_, i) => <div key={i} className="h-14 border-b border-[#f1f5f9] skeleton" />)}</div>
        ) : conversions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Target className="w-10 h-10 text-[#e2e8f0]" />
            <p className="text-sm text-[#94a3b8]">Bu filtrelerle dönüşüm bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8] whitespace-nowrap">Zaman</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Tip</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Değer</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Kampanya / Link</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Ülke</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Cihaz</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">Kaynak</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#94a3b8]">txid / fbclid</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map(conv => {
                  const cfg = TYPE_CFG[conv.type] ?? TYPE_CFG.CUSTOM;
                  const dev = (conv.click?.device ?? '').toLowerCase();
                  return (
                    <tr key={conv.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[#64748b]">
                        {fmt(conv.timestamp)}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {conv.value > 0
                          ? <span className="font-bold text-[#10b981]">{money(conv.value, conv.currency)}</span>
                          : <span className="text-[#e2e8f0]">—</span>}
                      </td>

                      {/* Campaign / Link */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0f172a] truncate max-w-[130px]">
                          {conv.link?.campaign?.name ?? <span className="text-[#94a3b8] font-normal">—</span>}
                        </p>
                        <p className="text-[#94a3b8] truncate max-w-[130px]">{conv.link?.name ?? '—'}</p>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[#64748b]">
                          <Globe className="w-3 h-3 text-[#94a3b8]" />
                          {conv.click?.country ?? '—'}
                          {conv.click?.city ? <span className="text-[#94a3b8]">, {conv.click.city}</span> : null}
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[#64748b]">
                          {DEVICE_ICON[dev] ?? <Monitor className="w-3.5 h-3.5 text-[#cbd5e1]" />}
                          {conv.click?.device ?? '—'}
                          {conv.click?.os ? <span className="text-[#94a3b8]">/ {conv.click.os}</span> : null}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[#64748b]">{conv.click?.utmSource ?? '(direct)'}</span>
                        {conv.click?.fbclid && (
                          <span className="ml-1 px-1 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-600 font-semibold">fb</span>
                        )}
                      </td>

                      {/* txid / fbclid */}
                      <td className="px-4 py-3">
                        {conv.txid && (
                          <p className="font-mono text-[#64748b] truncate max-w-[140px]" title={conv.txid}>
                            <span className="text-[#94a3b8]">txid:</span> {conv.txid}
                          </p>
                        )}
                        {conv.click?.fbclid && (
                          <p className="font-mono text-[#94a3b8] truncate max-w-[140px]" title={conv.click.fbclid}>
                            <span>fb:</span> {conv.click.fbclid.slice(0, 16)}…
                          </p>
                        )}
                        {!conv.txid && !conv.click?.fbclid && <span className="text-[#e2e8f0]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f5f9]">
            <p className="text-xs text-[#94a3b8]">
              {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} / {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center px-3 text-xs text-[#64748b]">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
