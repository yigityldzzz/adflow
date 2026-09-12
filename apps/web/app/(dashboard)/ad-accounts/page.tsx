'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Link2 as LinkIcon, Trash2, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Connection {
  id: string;
  platform: string;
  accountId: string;
  accountName: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
}

function AdAccountsInner() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await api.get<{ connections: Connection[] }>('/api/ad-accounts');
      setConnections(res.connections);
    } catch {
      toast({ type: 'error', title: 'Failed to load connected ad accounts' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const accounts = searchParams.get('accounts');
    const metaError = searchParams.get('meta_error');
    if (connected === 'meta') {
      toast({ type: 'success', title: 'Meta connected!', description: `${accounts ?? '0'} ad account(s) linked.` });
      fetchConnections();
    } else if (metaError) {
      toast({ type: 'error', title: 'Meta connection failed', description: decodeURIComponent(metaError) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await api.post<{ campaignsUpdated: number; campaignsSeenInMeta: number }>(`/api/ad-accounts/${id}/sync`, {});
      toast({ type: 'success', title: 'Synced', description: `${res.campaignsUpdated} campaign(s) updated from ${res.campaignsSeenInMeta} seen in Meta.` });
      fetchConnections();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm('Disconnect this ad account? Linked campaigns will stop auto-updating their cost.')) return;
    try {
      await api.delete(`/api/ad-accounts/${id}`);
      toast({ type: 'success', title: 'Disconnected' });
      fetchConnections();
    } catch {
      toast({ type: 'error', title: 'Failed to disconnect' });
    }
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
          <h2 className="text-xl font-bold text-[#0f172a]">Ad Account Connections</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Auto-pull ad spend from Meta into linked campaigns — no more manual cost entry.</p>
        </div>
        <button
          disabled
          title="Meta app review is in progress — this will open automatically once it's approved."
          className="inline-flex items-center gap-2 bg-[#e2e8f0] text-[#94a3b8] text-sm font-semibold px-4 py-2 rounded-xl cursor-not-allowed"
        >
          <span className="text-base opacity-60">📘</span>
          Connect Meta Ads — Coming Soon
        </button>
      </div>

      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e2e8f0] flex items-center justify-center">
              <LinkIcon className="w-7 h-7 text-[#94a3b8]" />
            </div>
            <p className="text-sm text-[#94a3b8] max-w-sm text-center">
              Meta Ads auto-sync is coming soon, while our app goes through Meta&apos;s review process. Until then, enter campaign cost manually on each campaign.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {connections.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4">
                <span className="text-base flex-shrink-0">📘</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a] truncate">{c.accountName ?? c.accountId}</p>
                  <p className="text-xs text-[#94a3b8] font-mono">{c.accountId}</p>
                </div>
                {c.lastSyncError ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 px-2 py-1 rounded-full border border-[#ef4444]/20" title={c.lastSyncError}>
                    <AlertCircle className="w-3 h-3" /> Sync error
                  </span>
                ) : c.lastSyncAt ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-full border border-[#10b981]/20">
                    <CheckCircle2 className="w-3 h-3" /> Synced {new Date(c.lastSyncAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#94a3b8] bg-[#e2e8f0] px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> Not synced yet
                  </span>
                )}
                <button
                  onClick={() => handleSync(c.id)}
                  disabled={syncingId === c.id}
                  className="flex-shrink-0 text-[#94a3b8] hover:text-[#6366f1] transition-colors"
                  title="Sync now"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingId === c.id ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => handleDisconnect(c.id)} className="flex-shrink-0 text-[#94a3b8] hover:text-[#ef4444] transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-2">How campaign linking will work</h3>
        <ol className="text-xs text-[#64748b] space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Connect your Meta Ads account above (one-time OAuth login).</li>
          <li>Open a campaign in AdFlow and pick its matching Meta campaign from the dropdown.</li>
          <li>AdFlow pulls that campaign&apos;s spend automatically every 6 hours, or click the sync icon above to refresh now.</li>
        </ol>
        <a
          href="https://developers.facebook.com/docs/marketing-api/get-started"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#6366f1] hover:underline mt-3"
        >
          Meta Marketing API docs <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function AdAccountsPage() {
  return (
    <Suspense fallback={<div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-40 skeleton" />}>
      <AdAccountsInner />
    </Suspense>
  );
}
