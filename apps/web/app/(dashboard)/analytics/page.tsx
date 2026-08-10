'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  MousePointerClick,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Country {
  country: string | null;
  countryCode: string | null;
  clicks: number;
  pct?: number;
}

interface DeviceBreakdown {
  device: string;
  clicks: number;
  pct: number;
  percentage?: number;
}

interface UtmSource {
  source: string;
  clicks: number;
  pct?: number;
}

interface TimelinePoint {
  date: string;
  clicks: number;
  conversions?: number;
}

interface OverviewData {
  totalClicks: number;
  uniqueVisitors: number;
  totalConversions: number;
  revenue: number;
  botRate: number;
  botClicks: number;
}

const DEVICE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];
const COUNTRY_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-[#94a3b8] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#64748b] capitalize">{p.name}:</span>
          <span className="font-semibold text-[#0f172a]">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const deviceIcons: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="w-4 h-4" />,
  desktop: <Monitor className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [topCountries, setTopCountries] = useState<Country[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([]);
  const [utmSources, setUtmSources] = useState<UtmSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const fetchData = useCallback(async (selectedDays: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [overviewRes, timelineRes, countriesRes, devicesRes] = await Promise.allSettled([
        api.get<{ overview: OverviewData }>('/api/analytics/overview'),
        api.get<{ timeline: TimelinePoint[] }>(`/api/analytics/timeline?days=${selectedDays}`),
        api.get<{ countries: Country[] }>('/api/analytics/top-countries'),
        api.get<{ devices: DeviceBreakdown[] }>('/api/analytics/devices'),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview((overviewRes.value as { overview: OverviewData }).overview ?? null);
      }
      if (timelineRes.status === 'fulfilled') {
        setTimeline((timelineRes.value as { timeline: TimelinePoint[] }).timeline ?? []);
      }
      if (countriesRes.status === 'fulfilled') {
        const countries = (countriesRes.value as { countries: Country[] }).countries ?? [];
        const total = countries.reduce((s, c) => s + c.clicks, 0);
        setTopCountries(countries.slice(0, 8).map((c) => ({
          ...c,
          pct: total > 0 ? Math.round((c.clicks / total) * 100 * 10) / 10 : 0,
        })));
      }
      if (devicesRes.status === 'fulfilled') {
        const devs = (devicesRes.value as { devices: DeviceBreakdown[] }).devices ?? [];
        setDeviceBreakdown(devs.map((d) => ({
          device: d.device ? d.device.charAt(0).toUpperCase() + d.device.slice(1) : 'Unknown',
          clicks: d.clicks,
          pct: d.percentage ?? d.pct ?? 0,
        })));
      }
      setUtmSources([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [fetchData, days]);

  const botPct = overview?.botRate ?? 0;

  const chartTimeline = timeline.map((p) => ({
    ...p,
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const maxCountryClicks = Math.max(...topCountries.map((c) => c.clicks), 1);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-64 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Analytics</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Detailed traffic and attribution data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#ffffff] border border-[#e2e8f0] rounded-lg overflow-hidden">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? 'bg-[#6366f1] text-white' : 'text-[#94a3b8] hover:text-[#64748b]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(days, true)}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Click Timeline */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[#6366f1]" />
          <h3 className="text-sm font-semibold text-[#0f172a]">Click Timeline</h3>
          <span className="text-xs text-[#94a3b8]">— last {days} days</span>
        </div>
        {chartTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fill="url(#clickGrad2)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-[#94a3b8]">No timeline data available yet</p>
          </div>
        )}
      </div>

      {/* Row 2: Countries + Device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Countries */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Top Countries</h3>
          </div>
          {topCountries.length > 0 ? (
            <div className="space-y-3">
              {topCountries.map((c, i) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#94a3b8] w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-[#64748b]">{c.country || 'Unknown'}</span>
                      <span className="text-xs font-semibold text-[#0f172a]">{c.clicks?.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(c.clicks / maxCountryClicks) * 100}%`,
                          background: COUNTRY_COLORS[i % COUNTRY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  {c.pct !== undefined && (
                    <span className="text-xs text-[#94a3b8] w-12 text-right">{c.pct.toFixed(1)}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Globe className="w-8 h-8 text-[#e2e8f0]" />
              <p className="text-sm text-[#94a3b8]">No geographic data yet</p>
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Monitor className="w-4 h-4 text-[#8b5cf6]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Device Breakdown</h3>
          </div>

          <div className="flex items-center gap-6">
            {/* Pie chart */}
            <div className="flex-shrink-0">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    dataKey="pct"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    strokeWidth={2}
                    stroke="#f8fafc"
                  >
                    {deviceBreakdown.map((_, i) => (
                      <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-[#0f172a]">{payload[0].name}</p>
                          <p className="text-[#64748b]">{payload[0].value}%</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {deviceBreakdown.map((d, i) => (
                <div key={d.device} className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${DEVICE_COLORS[i % DEVICE_COLORS.length]}20`, color: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                  >
                    {deviceIcons[d.device.toLowerCase()] || <Monitor className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-[#64748b]">{d.device}</span>
                      <span className="text-xs font-bold text-[#0f172a]">{d.pct}%</span>
                    </div>
                    <div className="h-1 bg-[#e2e8f0] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${d.pct}%`, background: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: UTM Sources + Bot Traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UTM Sources */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Tag className="w-4 h-4 text-[#10b981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">UTM Source Breakdown</h3>
          </div>

          {utmSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={utmSources} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="source" type="category" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Tag className="w-8 h-8 text-[#e2e8f0]" />
              <p className="text-sm text-[#94a3b8]">No UTM data yet</p>
              <p className="text-xs text-[#94a3b8] text-center max-w-xs">
                Add UTM parameters to your tracking links to see source breakdown
              </p>
            </div>
          )}
        </div>

        {/* Bot Traffic */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-[#ef4444]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Bot & Fraud Detection</h3>
          </div>

          <div className="flex items-center justify-center py-4">
            {/* Circular progress */}
            <div className="relative">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="64" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="none"
                  stroke={botPct > 10 ? '#ef4444' : botPct > 5 ? '#f59e0b' : '#10b981'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(botPct / 100) * 402} 402`}
                  strokeDashoffset="100"
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p
                  className={`text-3xl font-extrabold ${
                    botPct > 10 ? 'text-[#ef4444]' : botPct > 5 ? 'text-[#f59e0b]' : 'text-[#10b981]'
                  }`}
                >
                  {botPct.toFixed(1)}%
                </p>
                <p className="text-xs text-[#94a3b8]">Bot Traffic</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="text-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <p className="text-lg font-bold text-[#10b981]">{(100 - botPct).toFixed(1)}%</p>
              <p className="text-[10px] text-[#94a3b8]">Human</p>
            </div>
            <div className="text-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <p className="text-lg font-bold text-[#f59e0b]">{botPct.toFixed(1)}%</p>
              <p className="text-[10px] text-[#94a3b8]">Bot</p>
            </div>
            <div className="text-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <p className="text-lg font-bold text-[#ef4444]">0.0%</p>
              <p className="text-[10px] text-[#94a3b8]">Blocked</p>
            </div>
          </div>

          {botPct > 5 && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#64748b]">
                Bot traffic above 5%. Review your campaigns for potential click fraud.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: (overview?.totalClicks ?? 0).toLocaleString(), icon: <MousePointerClick className="w-4 h-4" />, color: 'text-[#6366f1]' },
          { label: 'Unique IPs', value: (overview?.uniqueVisitors ?? 0).toLocaleString(), icon: <Globe className="w-4 h-4" />, color: 'text-[#8b5cf6]' },
          { label: 'Countries', value: String(topCountries.length || 0), icon: <Globe className="w-4 h-4" />, color: 'text-[#10b981]' },
          { label: 'Bot Rate', value: `${botPct.toFixed(1)}%`, icon: <Shield className="w-4 h-4" />, color: botPct > 5 ? 'text-[#f59e0b]' : 'text-[#10b981]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <p className="text-xl font-bold text-[#0f172a]">{stat.value}</p>
            <p className="text-xs text-[#94a3b8]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
