'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MousePointerClick,
  Target,
  DollarSign,
  Shield,
  TrendingDown,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Alert {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  triggered: boolean;
  lastChecked: string | null;
  createdAt: string;
  currentValue?: number;
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; icon: React.ReactNode; description: string }> = {
  clicks:      { label: 'Total Clicks',   unit: 'clicks',  icon: <MousePointerClick className="w-4 h-4" />, description: 'Total click count in last 30 days' },
  conversions: { label: 'Conversions',    unit: 'convs',   icon: <Target className="w-4 h-4" />,            description: 'Total conversion count in last 30 days' },
  revenue:     { label: 'Revenue',        unit: '$',       icon: <DollarSign className="w-4 h-4" />,        description: 'Total revenue in last 30 days' },
  bot_rate:    { label: 'Bot Rate',       unit: '%',       icon: <Shield className="w-4 h-4" />,            description: 'Percentage of bot traffic' },
  cpa:         { label: 'Cost Per Acq.',  unit: '$',       icon: <TrendingDown className="w-4 h-4" />,      description: 'Cost per acquisition (requires budget)' },
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

function formatValue(metric: string, value: number): string {
  if (metric === 'revenue' || metric === 'cpa') return `$${value.toFixed(2)}`;
  if (metric === 'bot_rate') return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: '', metric: 'bot_rate', condition: 'above', threshold: '', webhookUrl: '' });
  const [formError, setFormError] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get<{ alerts: Alert[] }>('/api/alerts');
      setAlerts((res as { alerts: Alert[] }).alerts ?? []);
    } catch {
      toast({ type: 'error', title: 'Failed to load alerts' });
    } finally {
      setLoading(false);
    }
  }, []);

  const evaluate = useCallback(async (silent = false) => {
    if (!silent) setEvaluating(true);
    try {
      const res = await api.post<{ alerts: Alert[] }>('/api/alerts/evaluate', {});
      setAlerts((res as { alerts: Alert[] }).alerts ?? []);
      if (!silent) toast({ type: 'success', title: 'Alerts evaluated', description: 'All rules checked against current metrics.' });
    } catch {
      if (!silent) toast({ type: 'error', title: 'Evaluation failed' });
    } finally {
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts().then(() => evaluate(true));
  }, [fetchAlerts, evaluate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.threshold) { setFormError('Threshold is required'); return; }
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/alerts', {
        name: form.name || `${METRIC_CONFIG[form.metric]?.label} ${form.condition} ${form.threshold}`,
        metric: form.metric,
        condition: form.condition,
        threshold: parseFloat(form.threshold),
        webhookUrl: form.webhookUrl || undefined,
      });
      toast({ type: 'success', title: 'Alert created' });
      setShowModal(false);
      setForm({ name: '', metric: 'bot_rate', condition: 'above', threshold: '', webhookUrl: '' });
      fetchAlerts().then(() => evaluate(true));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (alert: Alert) => {
    try {
      await api.patch(`/api/alerts/${alert.id}`, { enabled: !alert.enabled });
      setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, enabled: !a.enabled } : a));
    } catch {
      toast({ type: 'error', title: 'Failed to update alert' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setDeleteId(null);
      toast({ type: 'success', title: 'Alert deleted' });
    } catch {
      toast({ type: 'error', title: 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  };

  const triggered = alerts.filter((a) => a.triggered && a.enabled);
  const healthy   = alerts.filter((a) => !a.triggered && a.enabled);
  const disabled  = alerts.filter((a) => !a.enabled);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-20 skeleton" />)}
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
          <h2 className="text-xl font-bold text-[#0f172a]">Alerts</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Rule-based monitoring — {alerts.length} rule{alerts.length !== 1 ? 's' : ''}
            {triggered.length > 0 && <span className="text-[#ef4444] ml-1.5 font-medium">· {triggered.length} triggered</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => evaluate(false)}
            disabled={evaluating}
            className="inline-flex items-center gap-2 border border-[#e2e8f0] bg-[#ffffff] hover:bg-[#e2e8f0] text-[#64748b] text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
            Check now
          </button>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#ef4444] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Triggered</p>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{triggered.length}</p>
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#10b981] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Healthy</p>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{healthy.length}</p>
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] border-t-2 border-t-[#94a3b8] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-[#94a3b8]" />
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Disabled</p>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{disabled.length}</p>
        </div>
      </div>

      {/* Alert list */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Alert Rules</h3>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#e2e8f0] flex items-center justify-center">
              <Bell className="w-8 h-8 text-[#94a3b8]" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-[#64748b] mb-1">No alerts yet</p>
              <p className="text-sm text-[#94a3b8] max-w-sm">
                Create rules to monitor bot rate, click drops, revenue thresholds, and more.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Alert
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {alerts.map((alert) => {
              const cfg = METRIC_CONFIG[alert.metric];
              const isFired = alert.triggered && alert.enabled;
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-[#e2e8f0]/30 transition-colors ${isFired ? 'bg-[#ef4444]/5' : ''}`}
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    !alert.enabled ? 'bg-[#94a3b8]' : isFired ? 'bg-[#ef4444] shadow-sm shadow-red-500/50' : 'bg-[#10b981]'
                  }`} />

                  {/* Metric icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isFired ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#e2e8f0] text-[#94a3b8]'
                  }`}>
                    {cfg?.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a] truncate">{alert.name}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {cfg?.label} {alert.condition} {formatValue(alert.metric, alert.threshold)}
                      {alert.currentValue !== undefined && (
                        <span className={`ml-2 font-medium ${isFired ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                          · now: {formatValue(alert.metric, alert.currentValue)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    {!alert.enabled ? (
                      <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#e2e8f0] px-2 py-0.5 rounded-full">PAUSED</span>
                    ) : isFired ? (
                      <span className="text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full border border-[#ef4444]/20">TRIGGERED</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/20">OK</span>
                    )}
                  </div>

                  {/* Last checked */}
                  {alert.lastChecked && (
                    <span className="text-[10px] text-[#94a3b8] flex-shrink-0 hidden sm:block">
                      {timeAgo(alert.lastChecked)}
                    </span>
                  )}

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(alert)}
                    className="flex-shrink-0 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                    title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                  >
                    {alert.enabled
                      ? <ToggleRight className="w-5 h-5 text-[#6366f1]" />
                      : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteId(alert.id)}
                    className="flex-shrink-0 text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Alert Rule</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Monitor your campaign metrics automatically</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                <p className="text-sm text-[#ef4444]">{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Alert Name (optional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. High Bot Traffic"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Metric</label>
                <select
                  value={form.metric}
                  onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors appearance-none"
                >
                  {Object.entries(METRIC_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#94a3b8] mt-1">{METRIC_CONFIG[form.metric]?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors appearance-none"
                  >
                    <option value="above">Goes above</option>
                    <option value="below">Falls below</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">
                    Threshold {form.metric === 'bot_rate' || form.metric === 'cpa' || form.metric === 'revenue' ? (form.metric === 'bot_rate' ? '(%)' : '($)') : ''}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={form.threshold}
                    onChange={(e) => setForm((p) => ({ ...p, threshold: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
                <p className="text-xs text-[#94a3b8] mb-0.5">Alert will trigger when:</p>
                <p className="text-xs font-semibold text-[#0f172a]">
                  {METRIC_CONFIG[form.metric]?.label} {form.condition === 'above' ? 'goes above' : 'falls below'}{' '}
                  <span className="text-[#6366f1]">{form.threshold || '?'}{form.metric === 'bot_rate' ? '%' : form.metric === 'revenue' || form.metric === 'cpa' ? ' USD' : ''}</span>
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">
                    Webhook URL <span className="text-[#94a3b8]">(opsiyonel — alert tetiklenince POST atar)</span>
                  </label>
                  <input
                    type="url"
                    value={form.webhookUrl}
                    onChange={(e) => setForm((p) => ({ ...p, webhookUrl: e.target.value }))}
                    placeholder="https://hooks.slack.com/... veya n8n/Make webhook"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
                  />
                  <p className="text-[11px] text-[#94a3b8] mt-1">Alert koşulu ilk kez gerçekleştiğinde JSON payload ile tetiklenir.</p>
                </div>

                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  {formLoading ? 'Creating…' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[#ef4444]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">Delete Alert</h3>
                <p className="text-xs text-[#64748b]">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
