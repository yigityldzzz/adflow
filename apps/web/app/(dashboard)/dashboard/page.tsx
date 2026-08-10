'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings2,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  BarChart2,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Overview {
  visits: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number | null;
  roas: number | null;
  cr: number;
  suspiciousClicks: number;
  suspiciousRate: number;
}

interface TimelinePoint {
  date: string;
  clicks: number;
  uniqueVisitors: number;
  conversions: number;
  revenue: number;
}

interface CampaignRow extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
  trafficSource: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number | null;
  cr: number;
}

interface CountryRow extends Record<string, unknown> {
  countryCode: string;
  country: string;
  clicks: number;
  conversions: number;
  revenue: number;
  profit: number;
  cr: number;
  suspiciousRate: number;
}

interface SourceRow extends Record<string, unknown> {
  source: string;
  clicks: number;
  conversions: number;
  revenue: number;
  profit: number;
  cr: number;
  suspiciousRate: number;
}

interface DeviceRow extends Record<string, unknown> {
  device: string;
  clicks: number;
  conversions: number;
  revenue: number;
  profit: number;
  cr: number;
}

interface OsRow extends Record<string, unknown> {
  os: string;
  clicks: number;
  conversions: number;
  revenue: number;
  profit: number;
  cr: number;
}

interface BrowserRow extends Record<string, unknown> {
  browser: string;
  clicks: number;
  conversions: number;
  revenue: number;
  profit: number;
  cr: number;
}

interface DashboardData {
  overview: Overview;
  timeline: TimelinePoint[];
  campaigns: CampaignRow[];
  countries: CountryRow[];
  sources: SourceRow[];
  devices: DeviceRow[];
  os: OsRow[];
  browsers: BrowserRow[];
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRESETS = ['today', 'yesterday', 'last7d', 'last30d', 'thisMonth'] as const;
type Preset = typeof PRESETS[number];

const PRESET_LABELS: Record<Preset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7d: 'Last 7d',
  last30d: 'Last 30d',
  thisMonth: 'This Month',
};

const METRIC_COLORS: Record<string, string> = {
  clicks: '#6366f1',
  uniqueVisitors: '#8b5cf6',
  conversions: '#10b981',
  revenue: '#f59e0b',
};

const METRIC_LABELS: Record<string, string> = {
  clicks: 'Clicks',
  uniqueVisitors: 'Unique Visitors',
  conversions: 'Conversions',
  revenue: 'Revenue',
};

type SortKey = 'clicks' | 'conversions' | 'revenue' | 'cost' | 'profit' | 'cr';
type DetailMode = 'highest' | 'lowest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'clicks', label: 'Clicks' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'cost', label: 'Cost' },
  { value: 'profit', label: 'Profit' },
  { value: 'cr', label: 'CR%' },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function colorProfit(profit: number): string {
  if (profit > 0) return '#10b981';
  if (profit < 0) return '#ef4444';
  return '#64748b';
}

// ─────────────────────────────────────────────
// DetailsTable
// ─────────────────────────────────────────────

type Col<T> =
  | { key: keyof T & string; label: string; type: 'text' | 'number' | 'money' | 'pct' | 'profit' }

interface DetailsTableProps<T extends Record<string, unknown>> {
  title: string;
  rows: T[];
  nameKey: keyof T & string;
  nameLabel: string;
  col2: { key: keyof T & string; label: string };
  col3: { key: keyof T & string; label: string };
  col4Key: 'cr' | 'suspiciousRate';
  mode: DetailMode;
  sortKey: SortKey;
}

function DetailsTable<T extends Record<string, unknown>>({
  title,
  rows,
  nameKey,
  nameLabel,
  col2,
  col3,
  col4Key,
  mode,
  sortKey,
}: DetailsTableProps<T>) {
  const sorted = [...rows].sort((a, b) => {
    const av = (a[sortKey] as number) ?? 0;
    const bv = (b[sortKey] as number) ?? 0;
    return mode === 'highest' ? bv - av : av - bv;
  });
  const displayed = sorted.slice(0, 8);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <BarChart2 size={14} color="#6366f1" />
        <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>{title}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#ffffff' }}>
            <th style={thStyle}>#&nbsp;{nameLabel}</th>
            <th style={thStyle}>{col2.label}</th>
            <th style={thStyle}>{col3.label}</th>
            <th style={thStyle}>{col4Key === 'cr' ? 'CR%' : 'Susp%'}</th>
            <th style={thStyle}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {displayed.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px', fontSize: '12px' }}>
                No data
              </td>
            </tr>
          ) : (
            displayed.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderTop: '1px solid #e2e8f0',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc')}
                onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
              >
                <td style={tdStyle}>
                  <span style={{ color: '#94a3b8', marginRight: '8px', fontSize: '11px' }}>
                    {i + 1}
                  </span>
                  <span style={{ color: '#0f172a' }}>{String(row[nameKey] ?? '—')}</span>
                </td>
                <td style={tdStyle}>{fmt(Number(row[col2.key] ?? 0))}</td>
                <td style={tdStyle}>{fmt(Number(row[col3.key] ?? 0))}</td>
                <td style={tdStyle}>{fmtPct(Number(row[col4Key] ?? 0))}</td>
                <td style={{ ...tdStyle, color: colorProfit(Number(row['profit'] ?? 0)), fontWeight: 600 }}>
                  {fmtMoney(Number(row['profit'] ?? 0))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: '11px',
  color: '#94a3b8',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '12px',
  color: '#64748b',
};

// ─────────────────────────────────────────────
// MetricCard
// ─────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  subLabel?: string;
  subColor?: string;
}

function MetricCard({ label, value, sub, subLabel, subColor }: MetricCardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '14px 16px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: subColor ?? '#64748b' }}>
          {subLabel && <span style={{ color: '#94a3b8' }}>{subLabel}: </span>}
          {sub}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function DashboardPage() {
  // Date range state
  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Data state
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart state
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['clicks', 'conversions', 'revenue']);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Details state
  const [detailMode, setDetailMode] = useState<DetailMode>('highest');
  const [sortKey, setSortKey] = useState<SortKey>('clicks');

  // Export dropdown
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Metrics modal temp state
  const [tempMetrics, setTempMetrics] = useState<string[]>([]);

  // ── Fetch ──────────────────────────────────

  const buildParams = useCallback(() => {
    if (isCustom && customFrom && customTo) {
      return `from=${customFrom}&to=${customTo}`;
    }
    return `preset=${preset}`;
  }, [isCustom, customFrom, customTo, preset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DashboardData>(`/api/analytics/dashboard?${buildParams()}`);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Close export dropdown on outside click ──

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Preset cycling ──────────────────────────

  function cyclePreset(dir: 1 | -1) {
    if (isCustom) {
      setIsCustom(false);
      return;
    }
    const idx = PRESETS.indexOf(preset);
    const next = (idx + dir + PRESETS.length) % PRESETS.length;
    setPreset(PRESETS[next]);
  }

  function selectPreset(p: Preset) {
    setPreset(p);
    setIsCustom(false);
    setCustomFrom('');
    setCustomTo('');
  }

  function applyCustom() {
    if (customFrom && customTo) {
      setIsCustom(true);
    }
  }

  // ── Export ──────────────────────────────────

  function handleExport(type: 'clicks' | 'conversions') {
    const params = buildParams();
    window.location.href = `/api/analytics/export?type=${type}&${params}`;
    setShowExport(false);
  }

  // ── Metrics modal ───────────────────────────

  function openMetricsModal() {
    setTempMetrics([...activeMetrics]);
    setShowMetricsModal(true);
  }

  function toggleTempMetric(m: string) {
    setTempMetrics(prev =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter(x => x !== m) : prev
        : prev.length < 7 ? [...prev, m] : prev
    );
  }

  function applyMetrics() {
    setActiveMetrics(tempMetrics);
    setShowMetricsModal(false);
  }

  // ── Derived overview values ─────────────────

  const ov = data?.overview;

  const roiLabel = ov?.roi != null ? fmtPct(ov.roi) : '—';
  const profitColor = ov ? colorProfit(ov.profit) : '#64748b';

  // ── Render ──────────────────────────────────

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px', color: '#0f172a', fontFamily: 'inherit' }}>

      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>

        {/* Left: date controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

          {/* Prev arrow */}
          <button onClick={() => cyclePreset(-1)} style={iconBtnStyle} title="Previous preset">
            <ChevronLeft size={16} />
          </button>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => selectPreset(p)}
                style={{
                  ...presetBtnBase,
                  background: !isCustom && preset === p ? '#6366f1' : '#ffffff',
                  color: !isCustom && preset === p ? '#fff' : '#64748b',
                  border: `1px solid ${!isCustom && preset === p ? '#6366f1' : '#e2e8f0'}`,
                }}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
            {isCustom && (
              <span style={{ ...presetBtnBase, background: '#6366f1', color: '#fff', border: '1px solid #6366f1' }}>
                Custom
              </span>
            )}
          </div>

          {/* Next arrow */}
          <button onClick={() => cyclePreset(1)} style={iconBtnStyle} title="Next preset">
            <ChevronRight size={16} />
          </button>

          {/* Custom date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            <Calendar size={14} color="#94a3b8" />
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={dateInputStyle}
              placeholder="From"
            />
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={dateInputStyle}
              placeholder="To"
            />
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              style={{
                ...presetBtnBase,
                background: customFrom && customTo ? '#6366f1' : '#ffffff',
                color: customFrom && customTo ? '#fff' : '#94a3b8',
                border: '1px solid #e2e8f0',
                cursor: customFrom && customTo ? 'pointer' : 'not-allowed',
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Right: export + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }} ref={exportRef}>
            <button
              onClick={() => setShowExport(v => !v)}
              style={{ ...presetBtnBase, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', right: 0, top: '36px', zIndex: 50,
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                minWidth: '180px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <button onClick={() => handleExport('clicks')} style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '10px 14px', fontSize: '13px', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Export Clicks
                </button>
                <button onClick={() => handleExport('conversions')} style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '10px 14px', fontSize: '13px', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Export Conversions
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={fetchData} style={iconBtnStyle} title="Refresh" disabled={loading}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ color: '#ef4444', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* ── Metric Bar ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <MetricCard label="Visits" value={loading ? '—' : fmt(ov?.visits ?? 0)} />
        <MetricCard
          label="Clicks"
          value={loading ? '—' : fmt(ov?.clicks ?? 0)}
          sub={loading ? undefined : fmtPct(ov?.suspiciousRate ?? 0)}
          subLabel="Susp"
          subColor="#f59e0b"
        />
        <MetricCard
          label="Conversions"
          value={loading ? '—' : fmt(ov?.conversions ?? 0)}
          sub={loading ? undefined : fmtPct(ov?.cr ?? 0)}
          subLabel="CR"
          subColor="#10b981"
        />
        <MetricCard label="Revenue" value={loading ? '—' : fmtMoney(ov?.revenue ?? 0)} />
        <MetricCard label="Cost" value={loading ? '—' : fmtMoney(ov?.cost ?? 0)} />
        <MetricCard
          label="Profit"
          value={loading ? '—' : fmtMoney(ov?.profit ?? 0)}
          subColor={profitColor}
        />
        <MetricCard
          label="ROI"
          value={loading ? '—' : roiLabel}
          sub={loading ? undefined : ov?.roas != null ? `${ov.roas.toFixed(2)}x ROAS` : undefined}
          subColor="#64748b"
        />
      </div>

      {/* ── Performance Chart ── */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
        padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#6366f1" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Performance</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {activeMetrics.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: METRIC_COLORS[m] }} />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{METRIC_LABELS[m]}</span>
                </div>
              ))}
            </div>

            <button onClick={openMetricsModal} style={{ ...presetBtnBase, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Settings2 size={13} />
              Change metrics
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading chart…
          </div>
        ) : (data?.timeline?.length ?? 0) === 0 ? (
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No timeline data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data?.timeline ?? []} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={d => {
                  const parts = d.split('-');
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '12px', color: '#0f172a',
                }}
                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
              />
              {activeMetrics.map(m => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  stroke={METRIC_COLORS[m]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  name={METRIC_LABELS[m]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Details Section ── */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(['highest', 'lowest'] as DetailMode[]).map(m => (
            <button
              key={m}
              onClick={() => setDetailMode(m)}
              style={{
                ...presetBtnBase,
                display: 'flex', alignItems: 'center', gap: '5px',
                background: detailMode === m ? '#6366f1' : '#ffffff',
                color: detailMode === m ? '#fff' : '#64748b',
                border: `1px solid ${detailMode === m ? '#6366f1' : '#e2e8f0'}`,
              }}
            >
              {m === 'highest' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sort by:</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortKey(opt.value)}
                style={{
                  ...presetBtnBase,
                  background: sortKey === opt.value ? '#e2e8f0' : 'transparent',
                  color: sortKey === opt.value ? '#0f172a' : '#94a3b8',
                  border: `1px solid ${sortKey === opt.value ? '#6366f1' : 'transparent'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6 Detail Tables (2-col grid) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

        {/* 1. Campaigns */}
        <DetailsTable<CampaignRow>
          title="Campaigns"
          rows={data?.campaigns ?? []}
          nameKey="name"
          nameLabel="Name"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="cr"
          mode={detailMode}
          sortKey={sortKey}
        />

        {/* 2. Traffic Sources */}
        <DetailsTable<SourceRow>
          title="Traffic Sources"
          rows={data?.sources ?? []}
          nameKey="source"
          nameLabel="Source"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="suspiciousRate"
          mode={detailMode}
          sortKey={sortKey}
        />

        {/* 3. Countries */}
        <DetailsTable<CountryRow>
          title="Countries"
          rows={data?.countries ?? []}
          nameKey="country"
          nameLabel="Country"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="suspiciousRate"
          mode={detailMode}
          sortKey={sortKey}
        />

        {/* 4. Devices */}
        <DetailsTable<DeviceRow>
          title="Devices"
          rows={data?.devices ?? []}
          nameKey="device"
          nameLabel="Device"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="cr"
          mode={detailMode}
          sortKey={sortKey}
        />

        {/* 5. OS */}
        <DetailsTable<OsRow>
          title="OS"
          rows={data?.os ?? []}
          nameKey="os"
          nameLabel="OS"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="cr"
          mode={detailMode}
          sortKey={sortKey}
        />

        {/* 6. Browsers */}
        <DetailsTable<BrowserRow>
          title="Browsers"
          rows={data?.browsers ?? []}
          nameKey="browser"
          nameLabel="Browser"
          col2={{ key: 'clicks', label: 'Clicks' }}
          col3={{ key: 'conversions', label: 'Conv.' }}
          col4Key="cr"
          mode={detailMode}
          sortKey={sortKey}
        />
      </div>

      {/* ── Change Metrics Modal ── */}
      {showMetricsModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowMetricsModal(false); }}
        >
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '24px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Settings2 size={16} color="#6366f1" />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Change Metrics</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>Max 7</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {Object.keys(METRIC_COLORS).map(m => {
                const active = tempMetrics.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleTempMetric(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px',
                      background: active ? '#eff6ff' : 'transparent',
                      border: `1px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: active ? METRIC_COLORS[m] : '#e2e8f0',
                      border: `2px solid ${active ? METRIC_COLORS[m] : '#cbd5e1'}`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '13px', color: active ? '#0f172a' : '#64748b' }}>
                      {METRIC_LABELS[m]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowMetricsModal(false)}
                style={{ ...presetBtnBase, flex: 1, padding: '8px', justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={applyMetrics}
                style={{
                  ...presetBtnBase, flex: 1, padding: '8px', justifyContent: 'center',
                  background: '#6366f1', color: '#fff', border: '1px solid #6366f1',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared style objects
// ─────────────────────────────────────────────

const presetBtnBase: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all 0.15s',
};

const iconBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const dateInputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  color: '#0f172a',
  fontSize: '12px',
  padding: '5px 8px',
  outline: 'none',
  colorScheme: 'dark',
};
