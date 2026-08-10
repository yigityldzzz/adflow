'use client';

import { useEffect, useState, useCallback } from 'react';
import { Layout, Plus, Trash2, X, Loader2, Search, AlertCircle, ExternalLink, Code2, Copy, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Lander {
  id: string;
  name: string;
  url: string;
  countryLabel: string;
  tags: string[];
  status: string;
  createdAt: string;
}

const TOKENS = [
  '{clickid}', '{campaign.id}', '{campaign.name}', '{trafficsource.id}',
  '{lander.id}', '{lander.name}', '{offer.id}', '{country}', '{device}', '{os}',
];

const INITIAL_FORM = { name: '', url: '', countryLabel: 'Global', tags: '' };

export default function LandersPage() {
  const [landers, setLanders] = useState<Lander[]>([]);
  const [showScript, setShowScript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLanders = useCallback(async () => {
    try {
      const res = await api.get<{ landers: Lander[] }>('/api/landers');
      setLanders(res.landers ?? []);
    } catch {
      toast({ type: 'error', title: 'Failed to load landers' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLanders(); }, [fetchLanders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/landers', {
        name: form.name,
        url: form.url,
        countryLabel: form.countryLabel,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      toast({ type: 'success', title: 'Lander created!', description: `"${form.name}" added.` });
      setShowModal(false);
      setForm(INITIAL_FORM);
      fetchLanders();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/landers/${id}`);
      toast({ type: 'success', title: 'Deleted' });
      setLanders((p) => p.filter((l) => l.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const insertToken = (token: string) => setForm((p) => ({ ...p, url: p.url + token }));

  const filtered = landers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.countryLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* LP Tracking Script Panel */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowScript((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8fafc] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-[#6366f1]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#0f172a]">LP Tracking Script</p>
              <p className="text-xs text-[#94a3b8]">Landing page\'inize ekleyin — fbclid&apos;i yakalar, conversion\'u takip eder</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#94a3b8] transition-transform ${showScript ? "rotate-180" : ""}`} />
        </button>

        {showScript && (
          <div className="border-t border-[#e2e8f0] p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <span className="text-base">1️⃣</span>
                <div><p className="font-semibold text-[#0f172a] mb-0.5">Script&apos;i LP&apos;ye ekle</p><p className="text-[#94a3b8]">{"<head>"} içine yapıştır</p></div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <span className="text-base">2️⃣</span>
                <div><p className="font-semibold text-[#0f172a] mb-0.5">Meta reklam URL&apos;ini AdFlow linki yap</p><p className="text-[#94a3b8]">adflow.digitaladexpert.de/r/SLUG</p></div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <span className="text-base">3️⃣</span>
                <div><p className="font-semibold text-[#0f172a] mb-0.5">Conversion postback bağla</p><p className="text-[#94a3b8]">CAPI otomatik ateşlenir</p></div>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-[#0f172a] text-[#a5b4fc] text-[11px] p-4 rounded-xl overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">{`<!-- AdFlow LP Tracking Script -->
<script>
(function(){
  var ADFLOW_VID = 'adflow_vid';
  var ADFLOW_FB  = 'adflow_fbclid';

  function getCookie(n){
    var m=document.cookie.match('(?:^|;)\\s*'+n+'=([^;]*)');
    return m?decodeURIComponent(m[1]):null;
  }
  function setCookie(n,v,days){
    var d=new Date(); d.setTime(d.getTime()+days*864e5);
    document.cookie=n+'='+encodeURIComponent(v)+';path=/;expires='+d.toUTCString()+';SameSite=Lax';
  }

  // fbclid ve visitorId yakala
  var params=new URLSearchParams(window.location.search);
  var fbclid=params.get('fbclid');
  if(fbclid){ setCookie(ADFLOW_FB,fbclid,7); localStorage.setItem(ADFLOW_FB,fbclid); }
  else{ fbclid=localStorage.getItem(ADFLOW_FB)||getCookie(ADFLOW_FB); }

  var visitorId=params.get('adflow_vid')||getCookie(ADFLOW_VID);

  // Tüm çıkış linklerine parametreleri ekle
  function enhanceLink(a){
    try{
      if(!a.href||a.href.indexOf('javascript')==0||a.href.indexOf('#')==0)return;
      var url=new URL(a.href);
      if(url.hostname===window.location.hostname)return;
      if(fbclid) url.searchParams.set('fbclid',fbclid);
      if(visitorId) url.searchParams.set('sub1',visitorId);
      a.href=url.toString();
    }catch(e){}
  }

  document.querySelectorAll('a').forEach(enhanceLink);
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType===1){
          if(n.tagName==='A')enhanceLink(n);
          if(n.querySelectorAll)n.querySelectorAll('a').forEach(enhanceLink);
        }
      });
    });
  }).observe(document.body,{childList:true,subtree:true});
})();
</script>`}</pre>
              <button
                onClick={() => {
                  const script = `<!-- AdFlow LP Tracking Script -->
<script>
(function(){
  var ADFLOW_VID = 'adflow_vid';
  var ADFLOW_FB  = 'adflow_fbclid';
  function getCookie(n){ var m=document.cookie.match('(?:^|;)\\s*'+n+'=([^;]*)'); return m?decodeURIComponent(m[1]):null; }
  function setCookie(n,v,days){ var d=new Date(); d.setTime(d.getTime()+days*864e5); document.cookie=n+'='+encodeURIComponent(v)+';path=/;expires='+d.toUTCString()+';SameSite=Lax'; }
  var params=new URLSearchParams(window.location.search);
  var fbclid=params.get('fbclid');
  if(fbclid){ setCookie(ADFLOW_FB,fbclid,7); localStorage.setItem(ADFLOW_FB,fbclid); }
  else{ fbclid=localStorage.getItem(ADFLOW_FB)||getCookie(ADFLOW_FB); }
  var visitorId=params.get('adflow_vid')||getCookie(ADFLOW_VID);
  function enhanceLink(a){ try{ if(!a.href||a.href.indexOf('javascript')==0||a.href.indexOf('#')==0)return; var url=new URL(a.href); if(url.hostname===window.location.hostname)return; if(fbclid) url.searchParams.set('fbclid',fbclid); if(visitorId) url.searchParams.set('sub1',visitorId); a.href=url.toString(); }catch(e){} }
  document.querySelectorAll('a').forEach(enhanceLink);
  new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if(n.nodeType===1){ if(n.tagName==='A')enhanceLink(n); if(n.querySelectorAll)n.querySelectorAll('a').forEach(enhanceLink); } }); }); }).observe(document.body,{childList:true,subtree:true});
})();
<\/script>`;
                  navigator.clipboard.writeText(script);
                  alert('Script kopyalandı!');
                }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#a5b4fc] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" /> Kopyala
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-bold text-amber-700 mb-1">⚡ Nasıl çalışır?</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Meta reklamına tıklayan kullanıcı AdFlow linkine yönlenir → <strong>fbclid</strong> ve <strong>adflow_vid</strong> yakalanır → LP&apos;de script tüm linklere bu parametreleri ekler → Kullanıcı form doldurup dönüştüğünde postback gelir → AdFlow <strong>fbclid&apos;i click kaydından alır</strong> → Meta CAPI&apos;ye &ldquo;Purchase&rdquo; eventi atar → Meta algoritması hangi reklamın dönüştüğünü öğrenir.
              </p>
            </div>

            {/* Meta Pixel Browser Script */}
            <div className="border border-blue-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-200">
                <span className="text-sm">📘</span>
                <p className="text-xs font-bold text-blue-700">Meta Browser Pixel — Sinyal Gücünü 2x Artırır</p>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 bg-blue-100 border border-blue-300 rounded-full text-blue-600">ÖNERİLEN</span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-[#64748b] leading-relaxed">
                  Meta, aynı eventi hem <strong>tarayıcıdan (pixel)</strong> hem <strong>sunucudan (CAPI)</strong> alırsa eşleştirir — bu &ldquo;sinyal kopyalama&rdquo; match quality&apos;yi yükseltir, maliyeti düşürür. LP sayfana aşağıdaki kodu da ekle:
                </p>
                <div className="relative">
                  <pre className="bg-[#0f172a] text-[#86efac] text-[11px] p-4 rounded-xl overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">{`<!-- Meta Pixel Base Code — <head> içine ekle (AdFlow script'inden ÖNCE) -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq('init', 'PIXEL_ID_BURAYA');  // ← Meta Events Manager'dan aldığın Pixel ID
fbq('track', 'PageView');
</script>`}</pre>
                  <button
                    onClick={() => {
                      const s = `<!-- Meta Pixel Base Code -->\n<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;\nn.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,\ndocument,'script','https://connect.facebook.net/en_US/fbevents.js');\n\nfbq('init', 'PIXEL_ID_BURAYA');\nfbq('track', 'PageView');\n<\/script>`;
                      navigator.clipboard.writeText(s);
                      alert('Pixel kodu kopyalandı!');
                    }}
                    className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#86efac] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Kopyala
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                    <p className="font-semibold text-[#0f172a] mb-1">1. Pixel ID al</p>
                    <p className="text-[#94a3b8]">Meta Events Manager → Datasets → ID&apos;yi kopyala</p>
                  </div>
                  <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                    <p className="font-semibold text-[#0f172a] mb-1">2. LP&apos;ye ekle</p>
                    <p className="text-[#94a3b8]">AdFlow script&apos;inden önce, {"<head>"} içine yapıştır</p>
                  </div>
                  <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                    <p className="font-semibold text-[#0f172a] mb-1">3. Otomatik çalışır</p>
                    <p className="text-[#94a3b8]">PageView browser&apos;dan, Purchase CAPI&apos;den — Meta eşleştirir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Landers</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">{landers.length} lander{landers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(INITIAL_FORM); }}
          className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> New Lander
        </button>
      </div>

      {landers.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input type="text" placeholder="Search landers…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 h-36 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex items-center justify-center">
            <Layout className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748b] mb-1">{search ? 'No landers found' : 'No landers yet'}</p>
            <p className="text-sm text-[#94a3b8] max-w-xs">{search ? 'Try a different search' : 'Add pre-lander pages to track intermediate steps in your funnel.'}</p>
          </div>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-2 inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add First Lander
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lander) => (
            <div key={lander.id} className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#cbd5e1] transition-all duration-200 group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-[#94a3b8] bg-[#e2e8f0] px-2.5 py-0.5 rounded-lg">{lander.countryLabel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${lander.status === 'active' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-[#f59e0b] bg-[#f59e0b]/10'}`}>
                      {lander.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a] truncate">{lander.name}</h3>
                </div>
                <button onClick={() => setDeleteId(lander.id)}
                  className="ml-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <a href={lander.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-[#6366f1] hover:text-[#818cf8] font-mono truncate transition-colors">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {lander.url}
              </a>
              {lander.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#e2e8f0]">
                  {lander.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#e2e8f0] text-[#94a3b8]">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#ffffff] flex items-center justify-between p-6 pb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">New Lander</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Add a pre-lander page to your funnel</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ef4444]">{formError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Lander Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Global - Landing Page 1"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Country Label</label>
                  <input type="text" value={form.countryLabel} onChange={(e) => setForm((p) => ({ ...p, countryLabel: e.target.value }))}
                    placeholder="Global"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Lander URL *</label>
                <input type="text" required value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.com/landing?click={clickid}"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] font-mono focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
                <div className="mt-2 flex flex-wrap gap-1">
                  {TOKENS.map((t) => (
                    <button key={t} type="button" onClick={() => insertToken(t)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#e2e8f0] text-[#6366f1] hover:bg-[#6366f1]/20 transition-colors font-mono">{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Tags <span className="text-[#94a3b8]">(comma separated)</span></label>
                <input type="text" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="mobile, desktop, retargeting"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Plus className="w-4 h-4" />Save Lander</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#ef4444]" /></div>
              <div><h3 className="text-sm font-bold text-[#0f172a]">Delete Lander</h3><p className="text-xs text-[#64748b]">This cannot be undone</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
