'use client';

import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, Trash2, X, Loader2, Search, AlertCircle, ArrowRight, FlaskConical } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TrafficSource { id: string; name: string; platform: string; }
interface Offer  { id: string; name: string; url: string; }
interface Lander { id: string; name: string; url: string; }

interface Rule {
  condition: string;
  operator?: string;
  value?: string;
  offerId?: string;
  landerId?: string;
}

interface ABPath {
  weight: number;
  landerId?: string;
  offerId?: string;
}

interface Flow {
  id: string;
  name: string;
  status: string;
  trafficSourceId?: string;
  landerId?: string;
  offerId?: string;
  rules: Rule[];
  paths?: ABPath[];
  createdAt: string;
}

const CONDITIONS = [
  { value: 'always',  label: 'Always (default)' },
  { value: 'country', label: 'Country' },
  { value: 'device',  label: 'Device' },
  { value: 'os',      label: 'OS' },
  { value: 'language',label: 'Language' },
];

const INITIAL_FORM = { name: '', trafficSourceId: '' };
const INITIAL_PATHS: ABPath[] = [
  { weight: 50, landerId: '', offerId: '' },
  { weight: 50, landerId: '', offerId: '' },
];

const STATUS_STYLE: Record<string, string> = {
  active:   'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20',
  paused:   'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  archived: 'text-[#94a3b8] bg-[#e2e8f0] border-[#e2e8f0]',
};

export default function FlowsPage() {
  const [flows,   setFlows]   = useState<Flow[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [landers, setLanders] = useState<Lander[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  // Modal state
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState(INITIAL_FORM);
  const [mode,        setMode]        = useState<'simple' | 'ab'>('simple');
  // Simple mode
  const [simpleLander, setSimpleLander] = useState('');
  const [simpleOffer,  setSimpleOffer]  = useState('');
  const [rules,        setRules]        = useState<Rule[]>([]);
  // A/B mode
  const [paths, setPaths] = useState<ABPath[]>(INITIAL_PATHS);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,   setFormError]   = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [f, s, o, l] = await Promise.all([
        api.get<{ flows: Flow[] }>('/api/flows'),
        api.get<{ trafficSources: TrafficSource[] }>('/api/traffic-sources'),
        api.get<{ offers: Offer[] }>('/api/offers'),
        api.get<{ landers: Lander[] }>('/api/landers'),
      ]);
      setFlows(f.flows ?? []);
      setSources(s.trafficSources ?? []);
      setOffers(o.offers ?? []);
      setLanders(l.landers ?? []);
    } catch { toast({ type: 'error', title: 'Failed to load flows' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = () => {
    setForm(INITIAL_FORM);
    setMode('simple');
    setSimpleLander('');
    setSimpleOffer('');
    setRules([]);
    setPaths(INITIAL_PATHS.map(p => ({ ...p })));
    setFormError('');
    setShowModal(true);
  };

  // A/B path helpers
  const updatePath = (i: number, patch: Partial<ABPath>) =>
    setPaths(p => p.map((path, idx) => idx === i ? { ...path, ...patch } : path));

  const addPath = () => setPaths(p => {
    const eq = Math.floor(100 / (p.length + 1));
    return [...p, { weight: eq, landerId: '', offerId: '' }];
  });

  const removePath = (i: number) => setPaths(p => p.filter((_, idx) => idx !== i));

  const totalWeight = paths.reduce((s, p) => s + (p.weight || 0), 0);

  const autoBalance = () => {
    const eq = Math.floor(100 / paths.length);
    const rem = 100 - eq * paths.length;
    setPaths(p => p.map((path, i) => ({ ...path, weight: eq + (i === 0 ? rem : 0) })));
  };

  // Rules helpers
  const addRule    = () => setRules(r => [...r, { condition: 'country', operator: 'is', value: '', offerId: '' }]);
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, patch: Partial<Rule>) =>
    setRules(r => r.map((rule, idx) => idx === i ? { ...rule, ...patch } : rule));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    if (mode === 'ab' && totalWeight !== 100) {
      setFormError(`Toplam ağırlık 100 olmalı (şu an: ${totalWeight})`);
      return;
    }
    setFormError(''); setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        trafficSourceId: form.trafficSourceId || undefined,
        rules: rules.filter(r => r.condition),
      };
      if (mode === 'simple') {
        payload.landerId = simpleLander || undefined;
        payload.offerId  = simpleOffer  || undefined;
        payload.paths    = [];
      } else {
        payload.paths = paths.map(p => ({
          weight:   p.weight,
          landerId: p.landerId || undefined,
          offerId:  p.offerId  || undefined,
        }));
      }
      await api.post('/api/flows', payload);
      toast({ type: 'success', title: 'Flow oluşturuldu!', description: `"${form.name}" hazır.` });
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/flows/${id}`);
      toast({ type: 'success', title: 'Silindi' });
      setFlows(p => p.filter(f => f.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Silinemedi', description: err instanceof Error ? err.message : undefined });
    } finally { setDeleting(false); }
  };

  const filtered = flows.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Flows</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">{flows.length} flow</p>
        </div>
        <button onClick={openModal}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> New Flow
        </button>
      </div>

      {flows.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input type="text" placeholder="Flow ara…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors" />
        </div>
      )}

      {/* Flow Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 h-44 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <GitBranch className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">{search ? 'Flow bulunamadı' : 'Henüz flow yok'}</p>
            <p className="text-sm text-[#94a3b8] max-w-xs">Trafiği yönlendirmek veya A/B test yapmak için flow oluştur.</p>
          </div>
          {!search && (
            <button onClick={openModal} className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> İlk Flow&apos;u Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(flow => {
            const source = sources.find(s => s.id === flow.trafficSourceId);
            const lander = landers.find(l => l.id === flow.landerId);
            const offer  = offers.find(o  => o.id  === flow.offerId);
            const isAB   = flow.paths && flow.paths.length > 0;
            return (
              <div key={flow.id} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md border capitalize ${STATUS_STYLE[flow.status] ?? STATUS_STYLE.active}`}>{flow.status}</span>
                      {isAB && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border bg-purple-50 border-purple-200 text-purple-600">
                          <FlaskConical className="w-2.5 h-2.5" /> A/B Test
                        </span>
                      )}
                      {flow.rules.length > 0 && <span className="text-xs text-[#94a3b8]">{flow.rules.length} kural</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-[#0f172a] truncate">{flow.name}</h3>
                  </div>
                  <button onClick={() => setDeleteId(flow.id)}
                    className="ml-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* A/B paths visualization */}
                {isAB ? (
                  <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-1.5">
                    {flow.paths!.map((path, i) => {
                      const pl = landers.find(l => l.id === path.landerId);
                      const po = offers.find(o => o.id === path.offerId);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-8 text-center text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 py-0.5">
                            {path.weight}%
                          </div>
                          <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${path.weight}%` }} />
                          </div>
                          <span className="text-xs text-[#64748b] truncate max-w-[120px]">
                            {pl?.name ?? po?.name ?? '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#e2e8f0] flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs bg-[#f8fafc] rounded-lg px-2.5 py-1.5 border border-[#e2e8f0]">
                      <span className="text-[#94a3b8]">Kaynak:</span>
                      <span className="text-[#64748b] font-medium">{source?.name ?? '—'}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#e2e8f0] flex-shrink-0" />
                    {lander && (
                      <>
                        <div className="flex items-center gap-1.5 text-xs bg-[#f8fafc] rounded-lg px-2.5 py-1.5 border border-[#e2e8f0]">
                          <span className="text-[#94a3b8]">LP:</span>
                          <span className="text-[#64748b] font-medium">{lander.name}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-[#e2e8f0] flex-shrink-0" />
                      </>
                    )}
                    <div className="flex items-center gap-1.5 text-xs bg-[#6366f1]/10 rounded-lg px-2.5 py-1.5 border border-[#6366f1]/20">
                      <span className="text-[#94a3b8]">Offer:</span>
                      <span className="text-[#818cf8] font-medium">{offer?.name ?? '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0] z-10">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Flow</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Trafiği yönlendir veya A/B test kur</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ef4444]">{formError}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Flow Adı *</label>
                <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="örn. Meta → Quiz LP → Kayıt"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>

              {/* Traffic Source */}
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Traffic Source</label>
                <select value={form.trafficSourceId} onChange={e => setForm(p => ({ ...p, trafficSourceId: e.target.value }))}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                  <option value="">— None —</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Mode toggle */}
              <div>
                <p className="text-xs font-medium text-[#64748b] mb-2">Routing Modu</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('simple')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${mode === 'simple' ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                    <GitBranch className="w-3.5 h-3.5" /> Basit Yönlendirme
                  </button>
                  <button type="button" onClick={() => setMode('ab')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${mode === 'ab' ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                    <FlaskConical className="w-3.5 h-3.5" /> A/B Split Test
                  </button>
                </div>
              </div>

              {/* Simple mode */}
              {mode === 'simple' && (
                <div className="space-y-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                  <div>
                    <label className="block text-[11px] text-[#94a3b8] mb-1">Lander (opsiyonel)</label>
                    <select value={simpleLander} onChange={e => setSimpleLander(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                      <option value="">— Lander yok —</option>
                      {landers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-[#e2e8f0]" /><ArrowRight className="w-3 h-3 text-[#94a3b8]" /><div className="h-px flex-1 bg-[#e2e8f0]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#94a3b8] mb-1">Offer</label>
                    <select value={simpleOffer} onChange={e => setSimpleOffer(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors">
                      <option value="">— Offer seç —</option>
                      {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* A/B mode */}
              {mode === 'ab' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#64748b]">Test Paths</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={autoBalance}
                        className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors px-2 py-1 border border-[#6366f1]/30 rounded-lg">
                        Eşitle
                      </button>
                      <button type="button" onClick={addPath}
                        className="text-xs text-[#6366f1] hover:text-[#818cf8] flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Path Ekle
                      </button>
                    </div>
                  </div>

                  {/* Weight bar */}
                  <div className="h-2 rounded-full overflow-hidden flex gap-px bg-[#f1f5f9]">
                    {paths.map((path, i) => {
                      const colors = ['bg-purple-400','bg-blue-400','bg-emerald-400','bg-amber-400'];
                      return (
                        <div key={i} className={`${colors[i % colors.length]} transition-all`}
                          style={{ width: `${Math.max(0, path.weight)}%` }} />
                      );
                    })}
                  </div>
                  <p className={`text-xs ${totalWeight === 100 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    Toplam: {totalWeight}% {totalWeight !== 100 ? '(100 olmalı)' : '✓'}
                  </p>

                  {paths.map((path, i) => {
                    const colors = ['border-purple-200 bg-purple-50','border-blue-200 bg-blue-50','border-emerald-200 bg-emerald-50','border-amber-200 bg-amber-50'];
                    const labels = ['A','B','C','D'];
                    return (
                      <div key={i} className={`border rounded-xl p-3 space-y-2 ${colors[i % colors.length]}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0f172a]">Varyant {labels[i]}</span>
                          <div className="flex items-center gap-2">
                            <input type="number" min={1} max={99} value={path.weight}
                              onChange={e => updatePath(i, { weight: parseInt(e.target.value) || 0 })}
                              className="w-16 text-center bg-white border border-[#e2e8f0] rounded-lg px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]" />
                            <span className="text-xs text-[#94a3b8]">%</span>
                            {paths.length > 2 && (
                              <button type="button" onClick={() => removePath(i)}
                                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#ef4444] transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-[#94a3b8] mb-1">Lander</label>
                            <select value={path.landerId ?? ''} onChange={e => updatePath(i, { landerId: e.target.value })}
                              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
                              <option value="">— None —</option>
                              {landers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#94a3b8] mb-1">Offer</label>
                            <select value={path.offerId ?? ''} onChange={e => updatePath(i, { offerId: e.target.value })}
                              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
                              <option value="">— None —</option>
                              {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conditional Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#64748b]">Koşullu Kurallar (opsiyonel)</p>
                  <button type="button" onClick={addRule}
                    className="text-xs text-[#6366f1] hover:text-[#818cf8] flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Kural Ekle
                  </button>
                </div>
                {rules.length === 0 && (
                  <p className="text-xs text-[#94a3b8] italic">Kural yok — tüm trafik yukarıdaki patha gider</p>
                )}
                <div className="space-y-2">
                  {rules.map((rule, i) => (
                    <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={rule.condition} onChange={e => updateRule(i, { condition: e.target.value })}
                          className="flex-1 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
                          {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        {rule.condition !== 'always' && (
                          <input type="text" placeholder="TR, mobile…" value={rule.value ?? ''}
                            onChange={e => updateRule(i, { value: e.target.value })}
                            className="flex-1 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1]" />
                        )}
                        <button type="button" onClick={() => removeRule(i)}
                          className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#ef4444] transition-colors flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#94a3b8]">→ Lander:</label>
                          <select value={rule.landerId ?? ''} onChange={e => updateRule(i, { landerId: e.target.value })}
                            className="w-full mt-0.5 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
                            <option value="">— Default —</option>
                            {landers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#94a3b8]">→ Offer:</label>
                          <select value={rule.offerId ?? ''} onChange={e => updateRule(i, { offerId: e.target.value })}
                            className="w-full mt-0.5 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#6366f1]">
                            <option value="">— Default —</option>
                            {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">İptal</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Flow Oluştur
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
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#ef4444]" /></div>
              <div><h3 className="text-sm font-bold text-[#0f172a]">Flow Sil</h3><p className="text-xs text-[#64748b]">Bu işlem geri alınamaz</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">İptal</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
