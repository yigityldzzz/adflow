'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  MousePointerClick,
  Target,
  DollarSign,
  Activity,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  totalClicks: number;
  totalConversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  conversionRate: number;
}

interface TimelinePoint {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface Overview {
  totalClicks: number;
  uniqueVisitors: number;
  totalConversions: number;
  revenue: number;
  avgROAS: number | null;
  botRate: number;
}

interface Changes {
  clicks: number | null;
  conversions: number | null;
  revenue: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20',
  PAUSED:   'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  ARCHIVED: 'text-[#94a3b8] bg-[#94a3b8]/10 border-[#94a3b8]/20',
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n ?? 0);
}

function pctBadge(v: number | null) {
  if (v === null) return <span className="text-[#94a3b8] text-xs">—</span>;
  const pos = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
      {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function downloadCSV(campaigns: CampaignRow[], timeline: TimelinePoint[], days: number) {
  const rows: string[][] = [];

  rows.push(['=== CAMPAIGN PERFORMANCE ===']);
  rows.push(['Campaign', 'Status', 'Budget', 'Clicks', 'Conversions', 'Revenue', 'ROAS', 'CPA', 'Conv. Rate']);
  campaigns.forEach((c) => {
    rows.push([
      c.name,
      c.status,
      c.budget != null ? String(c.budget) : '',
      String(c.totalClicks),
      String(c.totalConversions),
      c.revenue.toFixed(2),
      c.roas != null ? c.roas.toFixed(2) : '',
      c.cpa != null ? c.cpa.toFixed(2) : '',
      c.conversionRate.toFixed(2) + '%',
    ]);
  });

  rows.push([]);
  rows.push([`=== DAILY TIMELINE (last ${days} days) ===`]);
  rows.push(['Date', 'Clicks', 'Conversions', 'Revenue']);
  timeline.forEach((t) => {
    rows.push([t.date, String(t.clicks), String(t.conversions), t.revenue.toFixed(2)]);
  });

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adflow-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [changes, setChanges] = useState<Changes>({ clicks: null, conversions: null, revenue: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (d: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [ovRes, campRes, tlRes] = await Promise.allSettled([
        api.get<{ overview: Overview; changes: Changes }>('/api/analytics/overview'),
        api.get<{ campaigns: CampaignRow[] }>('/api/analytics/by-campaign'),
        api.get<{ timeline: TimelinePoint[] }>(`/api/analytics/timeline?days=${d}`),
      ]);
      if (ovRes.status === 'fulfilled') {
        const v = ovRes.value as { overview: Overview; changes: Changes };
        setOverview(v.overview ?? null);
        setChanges(v.changes ?? { clicks: null, conversions: null, revenue: null });
      }
      if (campRes.status === 'fulfilled') {
        setCampaigns((campRes.value as { campaigns: CampaignRow[] }).campaigns ?? []);
      }
      if (tlRes.status === 'fulfilled') {
        setTimeline((tlRes.value as { timeline: TimelinePoint[] }).timeline ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(days); }, [fetchData, days]);

  const handleExport = () => {
    setExporting(true);
    try { downloadCSV(campaigns, timeline, days); }
    finally { setTimeout(() => setExporting(false), 800); }
  };

  const totalClicks = timeline.reduce((s, t) => s + t.clicks, 0);
  const totalConvs  = timeline.reduce((s, t) => s + t.conversions, 0);
  const totalRev    = timeline.reduce((s, t) => s + t.revenue, 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-24 skeleton" />)}
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-64 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Reports</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Performance summary & CSV export</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Days selector */}
          <div className="relative">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
              className="appearance-none bg-[#ffffff] border border-[#e2e8f0] rounded-xl pl-3 pr-8 py-2 text-sm text-[#64748b] focus:outline-none focus:border-[#6366f1] transition-colors"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          </div>
          <button
            onClick={() => fetchData(days, true)}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || campaigns.length === 0}
            className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks',     value: totalClicks.toLocaleString(),      change: changes.clicks,      icon: <MousePointerClick className="w-4 h-4" />, color: 'border-t-[#6366f1]',  iconColor: 'text-[#6366f1]' },
          { label: 'Unique Visitors',  value: (overview?.uniqueVisitors ?? 0).toLocaleString(), change: null, icon: <Activity className="w-4 h-4" />,          color: 'border-t-[#8b5cf6]',  iconColor: 'text-[#8b5cf6]' },
          { label: 'Conversions',      value: totalConvs.toLocaleString(),       change: changes.conversions, icon: <Target className="w-4 h-4" />,             color: 'border-t-[#10b981]',  iconColor: 'text-[#10b981]' },
          { label: 'Revenue',          value: fmtMoney(totalRev),                change: changes.revenue,     icon: <DollarSign className="w-4 h-4" />,         color: 'border-t-[#f59e0b]',  iconColor: 'text-[#f59e0b]' },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-[#ffffff] border border-[#e2e8f0] border-t-2 ${kpi.color} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0f172a] mb-1">{kpi.value}</p>
            {pctBadge(kpi.change)}
          </div>
        ))}
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Campaign Performance</h3>
          </div>
          <span className="text-xs text-[#94a3b8]">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-10 h-10 text-[#e2e8f0]" />
            <p className="text-sm text-[#94a3b8]">No campaigns yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  {['Campaign', 'Status', 'Budget', 'Clicks', 'Conversions', 'Conv. Rate', 'Revenue', 'ROAS', 'CPA'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#94a3b8] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id ?? i} className="border-b border-[#e2e8f0]/50 hover:bg-[#e2e8f0]/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[#0f172a]">{c.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.ARCHIVED}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748b]">
                      {c.budget != null ? fmtMoney(c.budget) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0f172a]">
                      {c.totalClicks.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748b]">
                      {c.totalConversions.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden max-w-[60px]">
                          <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${Math.min(c.conversionRate, 100)}%` }} />
                        </div>
                        <span className="text-xs text-[#64748b] whitespace-nowrap">{c.conversionRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#10b981]">
                      {c.revenue > 0 ? fmtMoney(c.revenue) : '—'}
                    </td>
                    <td
                      className="px-5 py-3.5 text-sm font-semibold"
                      style={{ color: c.roas == null ? '#64748b' : c.roas >= 1 ? '#10b981' : '#ef4444' }}
                    >
                      {c.roas != null ? `${c.roas.toFixed(2)}x` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748b]">
                      {c.cpa != null ? fmtMoney(c.cpa) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-[#f8fafc] border-t border-[#e2e8f0]">
                  <td className="px-5 py-3 text-xs font-bold text-[#0f172a]" colSpan={3}>TOTAL</td>
                  <td className="px-5 py-3 text-sm font-bold text-[#0f172a]">
                    {campaigns.reduce((s, c) => s + c.totalClicks, 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-[#0f172a]">
                    {campaigns.reduce((s, c) => s + c.totalConversions, 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-sm font-bold text-[#10b981]">
                    {fmtMoney(campaigns.reduce((s, c) => s + c.revenue, 0))}
                  </td>
                  <td className="px-5 py-3" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Daily Breakdown */}
      {timeline.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8b5cf6]" />
              <h3 className="text-sm font-semibold text-[#0f172a]">Daily Breakdown</h3>
            </div>
            <span className="text-xs text-[#94a3b8]">Last {days} days</span>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#ffffff]">
                <tr className="border-b border-[#e2e8f0]">
                  {['Date', 'Clicks', 'Conversions', 'Revenue'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...timeline].reverse().filter((t) => t.clicks > 0 || t.conversions > 0 || t.revenue > 0).map((t, i) => (
                  <tr key={i} className="border-b border-[#e2e8f0]/50 hover:bg-[#e2e8f0]/30 transition-colors">
                    <td className="px-5 py-2.5 text-sm text-[#64748b]">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-2.5 text-sm font-semibold text-[#0f172a]">{t.clicks.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-sm text-[#64748b]">{t.conversions.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-sm text-[#10b981]">{t.revenue > 0 ? fmtMoney(t.revenue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
