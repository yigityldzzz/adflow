'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Bot,
  CheckCircle2,
  Tag,
  Map,
  Clock,
  RefreshCw,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  Users,
  Repeat2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Click {
  id: string;
  visitorId: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  device?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  language?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  isBot: boolean;
  isSuspicious: boolean;
  timestamp: string;
  conversions: { id: string; type: string; value: number; currency: string }[];
}

interface LinkData {
  id: string;
  name: string;
  slug: string;
  destinationUrl: string;
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile:  <Smartphone className="w-3.5 h-3.5" />,
  desktop: <Monitor className="w-3.5 h-3.5" />,
  tablet:  <Tablet className="w-3.5 h-3.5" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function LinkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [clicks, setClicks] = useState<Click[]>([]);
  const [link, setLink] = useState<LinkData | null>(null);
  const [total, setTotal] = useState(0);
  const [humanCount, setHumanCount] = useState(0);
  const [botCount, setBotCount] = useState(0);
  const [convertedCount, setConvertedCount] = useState(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'human' | 'bot'>('all');
  const LIMIT = 30;

  const fetchClicks = useCallback(async (offset = 0, isRefresh = false, currentFilter: 'all' | 'human' | 'bot' = filter) => {
    if (isRefresh) setRefreshing(true);
    else if (offset === 0) setLoading(true);
    try {
      const filterParam = currentFilter !== 'all' ? `&filter=${currentFilter}` : '';
      const res = await api.get<{ clicks: Click[]; total: number; humanCount: number; botCount: number; convertedCount: number; uniqueCount: number; link: LinkData }>(
        `/api/links/${id}/clicks?limit=${LIMIT}&offset=${offset}${filterParam}`
      );
      const v = res as { clicks: Click[]; total: number; humanCount: number; botCount: number; convertedCount: number; uniqueCount: number; link: LinkData };
      setClicks(v.clicks ?? []);
      setTotal(v.total ?? 0);
      setHumanCount(v.humanCount ?? 0);
      setBotCount(v.botCount ?? 0);
      setConvertedCount(v.convertedCount ?? 0);
      setUniqueCount(v.uniqueCount ?? 0);
      if (v.link) setLink(v.link);
    } catch {
      router.push('/links');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router, filter]);

  useEffect(() => { fetchClicks(page * LIMIT); }, [fetchClicks, page]);

  const handleFilterChange = (f: 'all' | 'human' | 'bot') => {
    setFilter(f);
    setPage(0);
    setExpandedId(null);
    fetchClicks(0, false, f);
  };

  const countries = [...new Set(clicks.map((c) => c.country).filter(Boolean))].length;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 skeleton rounded-lg" />
          <div className="h-6 w-48 skeleton rounded" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#ffffff] border border-[#e2e8f0] rounded-2xl skeleton" />)}
        </div>
        <div className="h-96 bg-[#ffffff] border border-[#e2e8f0] rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/links')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">{link?.name ?? 'Link Detail'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-[#6366f1]">/r/{link?.slug}</span>
              {link?.destinationUrl && (
                <a
                  href={link.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#64748b] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {link.destinationUrl.length > 50 ? link.destinationUrl.slice(0, 50) + '…' : link.destinationUrl}
                </a>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchClicks(0, true)}
          disabled={refreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Clicks */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#6366f1] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Total Clicks</p>
            <div className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[#6366f1]"><MousePointerClick className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{humanCount.toLocaleString()}</p>
          {botCount > 0 && <p className="text-[10px] text-[#94a3b8] mt-1">+{botCount.toLocaleString()} bots filtered</p>}
        </div>

        {/* Unique Visitors */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#8b5cf6] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Unique</p>
            <div className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[#8b5cf6]"><Users className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{uniqueCount.toLocaleString()}</p>
          {humanCount > 0 && <p className="text-[10px] text-[#94a3b8] mt-1">{humanCount > 0 ? Math.round((uniqueCount / humanCount) * 100) : 0}% of clicks</p>}
        </div>

        {/* Repeat Visitors */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#06b6d4] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Repeat</p>
            <div className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[#06b6d4]"><Repeat2 className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{(humanCount - uniqueCount).toLocaleString()}</p>
          <p className="text-[10px] text-[#94a3b8] mt-1">return visits</p>
        </div>

        {/* Bots */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#ef4444] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Bots</p>
            <div className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[#ef4444]"><Bot className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{botCount.toLocaleString()}</p>
          {(humanCount + botCount) > 0 && <p className="text-[10px] text-[#94a3b8] mt-1">{Math.round((botCount / (humanCount + botCount)) * 100)}% of traffic</p>}
        </div>

        {/* Converted */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#f59e0b] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Converted</p>
            <div className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[#f59e0b]"><ShoppingCart className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{convertedCount.toLocaleString()}</p>
          {uniqueCount > 0 && <p className="text-[10px] text-[#94a3b8] mt-1">{uniqueCount > 0 ? Math.round((convertedCount / uniqueCount) * 100) : 0}% conv. rate</p>}
        </div>
      </div>

      {/* Click Table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Click Log</h3>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'human', 'bot'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filter === f
                    ? f === 'human' ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                    : f === 'bot' ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                    : 'bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30'
                    : 'bg-[#e2e8f0] text-[#94a3b8] border border-[#e2e8f0] hover:text-[#64748b]'
                }`}
              >
                {f === 'all' ? `All ${humanCount + botCount}` : f === 'human' ? `Human ${humanCount}` : `Bot ${botCount}`}
              </button>
            ))}
            <span className="text-xs text-[#94a3b8] ml-1">
              {total > LIMIT && `${page * LIMIT + 1}–${Math.min((page + 1) * LIMIT, total)} of ${total}`}
            </span>
          </div>
        </div>

        {clicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MousePointerClick className="w-10 h-10 text-[#e2e8f0]" />
            <p className="text-sm text-[#94a3b8]">No clicks recorded yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    {['Visitor', 'Location', 'Device & OS', 'Browser', 'Source', 'Time', 'Status'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#94a3b8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clicks.map((click) => (
                    <>
                      <tr
                        key={click.id}
                        onClick={() => setExpandedId(expandedId === click.id ? null : click.id)}
                        className={`border-b border-[#e2e8f0]/50 cursor-pointer transition-colors ${
                          expandedId === click.id ? 'bg-[#e2e8f0]/50' : 'hover:bg-[#e2e8f0]/30'
                        } ${click.isBot ? 'opacity-60' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <span className="text-xs font-mono text-[#64748b]">
                            {click.visitorId?.slice(0, 10)}…
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                            <Globe className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <span>{click.city ? `${click.city}, ` : ''}{click.country ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#64748b] capitalize">
                            {DEVICE_ICONS[click.device?.toLowerCase() ?? ''] ?? <Monitor className="w-3.5 h-3.5 text-[#94a3b8]" />}
                            <span>{click.device ?? '—'}</span>
                            {click.os && <span className="text-[#94a3b8]">· {click.os}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                            <Chrome className="w-3.5 h-3.5 text-[#94a3b8]" />
                            {click.browser ?? '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {click.utmSource ? (
                            <span className="text-xs text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full">{click.utmSource}</span>
                          ) : click.referrer ? (
                            <span className="text-xs text-[#94a3b8] truncate max-w-[100px] block">{click.referrer}</span>
                          ) : (
                            <span className="text-xs text-[#94a3b8]">direct</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <Clock className="w-3 h-3" />
                            <span title={fmtDate(click.timestamp)}>{timeAgo(click.timestamp)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {click.isBot ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full border border-[#ef4444]/20">
                                <Bot className="w-3 h-3" /> Bot
                              </span>
                            ) : click.isSuspicious ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full border border-[#f59e0b]/20">
                                <AlertTriangle className="w-3 h-3" /> Suspicious
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/20">
                                <CheckCircle2 className="w-3 h-3" /> Human
                              </span>
                            )}
                            {click.conversions.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full border border-[#f59e0b]/20">
                                <ShoppingCart className="w-3 h-3" /> Conv.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === click.id && (
                        <tr key={`${click.id}-detail`} className="bg-[#f8fafc]">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                              {[
                                { label: 'Visitor ID',   value: click.visitorId },
                                { label: 'IP',           value: click.ip ?? '—' },
                                { label: 'City',         value: click.city ?? '—' },
                                { label: 'Region',       value: click.region ?? '—' },
                                { label: 'Language',     value: click.language ?? '—' },
                                { label: 'Browser ver.', value: click.browserVersion ?? '—' },
                                { label: 'utm_campaign', value: click.utmCampaign ?? '—' },
                                { label: 'utm_medium',   value: click.utmMedium ?? '—' },
                                { label: 'utm_content',  value: click.utmContent ?? '—' },
                                { label: 'utm_term',     value: click.utmTerm ?? '—' },
                                { label: 'fbclid',       value: click.fbclid ? click.fbclid.slice(0, 20) + '…' : '—' },
                                { label: 'gclid',        value: click.gclid ? click.gclid.slice(0, 20) + '…' : '—' },
                                { label: 'Time',         value: fmtDate(click.timestamp) },
                                { label: 'Referrer',     value: click.referrer ?? '—' },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg p-2.5">
                                  <p className="text-[#94a3b8] mb-0.5">{label}</p>
                                  <p className="text-[#64748b] font-medium break-all">{value}</p>
                                </div>
                              ))}
                              {click.conversions.length > 0 && (
                                <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-2.5 col-span-2">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <ShoppingCart className="w-3.5 h-3.5 text-[#f59e0b]" />
                                    <p className="text-[#f59e0b] font-semibold">Conversion</p>
                                  </div>
                                  {click.conversions.map((cv) => (
                                    <p key={cv.id} className="text-[#64748b]">
                                      {cv.type} · {cv.value > 0 ? `${cv.value} ${cv.currency}` : 'no value'}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {total > LIMIT && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0]">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="text-xs text-[#64748b] hover:text-[#0f172a] disabled:opacity-40 px-3 py-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#e2e8f0] transition-colors">← Previous</button>
                <span className="text-xs text-[#94a3b8]">Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * LIMIT >= total} className="text-xs text-[#64748b] hover:text-[#0f172a] disabled:opacity-40 px-3 py-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#e2e8f0] transition-colors">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
