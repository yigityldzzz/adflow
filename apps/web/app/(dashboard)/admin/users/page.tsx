'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Crown, ArrowLeft, Users, MousePointerClick, ChevronRight, Ban, Zap, User } from 'lucide-react';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  name?: string;
  email: string;
  plan: string;
  role: string;
  suspended: boolean;
  createdAt: string;
  clicks: number;
  conversions: number;
  _count: { links: number; campaigns: number };
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-[#64748b] bg-[#e2e8f0] border-[#cbd5e1]',
  PRO: 'text-[#a5b4fc] bg-[#6366f1]/20 border-[#6366f1]/30',
  TEAM: 'text-[#c4b5fd] bg-[#8b5cf6]/20 border-[#8b5cf6]/30',
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <User className="w-3 h-3" />,
  PRO: <Zap className="w-3 h-3" />,
  TEAM: <Crown className="w-3 h-3" />,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const fetchUsers = useCallback(async (s = search, p = planFilter, offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (s) params.set('search', s);
      if (p) params.set('plan', p);
      const res = await api.get<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`);
      const v = res as { users: AdminUser[]; total: number };
      setUsers(v.users ?? []);
      setTotal(v.total ?? 0);
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, router]);

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    fetchUsers(val, planFilter, 0);
  };

  const handlePlan = (val: string) => {
    setPlanFilter(val);
    setPage(0);
    fetchUsers(search, val, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-[#94a3b8] hover:text-[#64748b] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Crown className="w-3.5 h-3.5 text-[#ef4444]" />
              <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">Admin</span>
            </div>
            <h2 className="text-xl font-bold text-[#0f172a]">Users <span className="text-[#94a3b8] font-normal text-base">({total})</span></h2>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['', 'FREE', 'PRO', 'TEAM'].map((p) => (
            <button
              key={p}
              onClick={() => handlePlan(p)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                planFilter === p
                  ? 'bg-[#6366f1] text-white border-[#6366f1]'
                  : 'bg-[#ffffff] text-[#94a3b8] border-[#e2e8f0] hover:text-[#64748b]'
              }`}
            >
              {p || 'All Plans'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                {['User', 'Plan', 'Clicks', 'Links', 'Campaigns', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#94a3b8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#e2e8f0]/50">
                    {[...Array(8)].map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Users className="w-8 h-8 text-[#e2e8f0] mx-auto mb-2" />
                    <p className="text-sm text-[#94a3b8]">No users found</p>
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#e2e8f0]/50 hover:bg-[#e2e8f0]/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#a5b4fc]">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0f172a] truncate max-w-[140px]">{u.name || '—'}</p>
                        <p className="text-[10px] text-[#94a3b8] truncate max-w-[140px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PLAN_COLORS[u.plan] || PLAN_COLORS.FREE}`}>
                      {PLAN_ICONS[u.plan]} {u.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 text-xs text-[#64748b]">
                      <MousePointerClick className="w-3 h-3 text-[#94a3b8]" />
                      {u.clicks.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748b]">{u._count.links}</td>
                  <td className="px-5 py-3 text-xs text-[#64748b]">{u._count.campaigns}</td>
                  <td className="px-5 py-3 text-xs text-[#94a3b8] whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    {u.suspended ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-2 py-0.5 rounded-md">
                        <Ban className="w-3 h-3" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2 py-0.5 rounded-md">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-[#94a3b8] hover:text-[#6366f1] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-[#94a3b8]">{page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => { setPage(p => p - 1); fetchUsers(search, planFilter, (page - 1) * LIMIT); }} className="px-3 py-1.5 text-xs border border-[#e2e8f0] rounded-lg text-[#64748b] disabled:opacity-40 hover:border-[#6366f1]/40 transition-colors">Prev</button>
              <button disabled={(page + 1) * LIMIT >= total} onClick={() => { setPage(p => p + 1); fetchUsers(search, planFilter, (page + 1) * LIMIT); }} className="px-3 py-1.5 text-xs border border-[#e2e8f0] rounded-lg text-[#64748b] disabled:opacity-40 hover:border-[#6366f1]/40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
