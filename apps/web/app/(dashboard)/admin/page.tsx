'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, MousePointerClick, Target, TrendingUp, Crown, Zap, User, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Overview {
  totalUsers: number;
  plans: { FREE: number; PRO: number; TEAM: number };
  totalClicks: number;
  totalConversions: number;
  recentUsers: { id: string; name: string; email: string; plan: string; createdAt: string }[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-[#64748b] bg-[#e2e8f0] border-[#cbd5e1]',
  PRO: 'text-[#a5b4fc] bg-[#6366f1]/20 border-[#6366f1]/30',
  TEAM: 'text-[#c4b5fd] bg-[#8b5cf6]/20 border-[#8b5cf6]/30',
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Overview>('/api/admin/overview')
      .then((res) => setData(res as Overview))
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 skeleton rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-[#ef4444]" />
            </div>
            <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">Admin Panel</span>
          </div>
          <h2 className="text-xl font-bold text-[#0f172a]">Overview</h2>
        </div>
        <Link href="/admin/users" className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Users className="w-4 h-4" /> Manage Users
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data.totalUsers, icon: <Users className="w-4 h-4" />, color: 'border-t-[#6366f1] text-[#6366f1]' },
          { label: 'Total Clicks', value: data.totalClicks.toLocaleString(), icon: <MousePointerClick className="w-4 h-4" />, color: 'border-t-[#10b981] text-[#10b981]' },
          { label: 'Conversions', value: data.totalConversions.toLocaleString(), icon: <Target className="w-4 h-4" />, color: 'border-t-[#f59e0b] text-[#f59e0b]' },
          { label: 'Paid Users', value: data.plans.PRO + data.plans.TEAM, icon: <TrendingUp className="w-4 h-4" />, color: 'border-t-[#8b5cf6] text-[#8b5cf6]' },
        ].map((s) => (
          <div key={s.label} className={`bg-[#ffffff] border border-[#e2e8f0] border-t-2 ${s.color.split(' ')[0]} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center ${s.color.split(' ')[1]}`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-[#0f172a]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Free', value: data.plans.FREE, icon: <User className="w-3.5 h-3.5" />, color: 'bg-[#94a3b8]' },
              { label: 'Pro', value: data.plans.PRO, icon: <Zap className="w-3.5 h-3.5" />, color: 'bg-[#6366f1]' },
              { label: 'Team', value: data.plans.TEAM, icon: <Crown className="w-3.5 h-3.5" />, color: 'bg-[#8b5cf6]' },
            ].map((p) => {
              const total = data.totalUsers || 1;
              const pct = Math.round((p.value / total) * 100);
              return (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs text-[#64748b]">
                      {p.icon} {p.label}
                    </div>
                    <span className="text-xs font-semibold text-[#0f172a]">{p.value} <span className="text-[#94a3b8]">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#e2e8f0] rounded-full">
                    <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Recent Signups</h3>
            <Link href="/admin/users" className="text-xs text-[#6366f1] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentUsers.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 hover:bg-[#e2e8f0] rounded-xl p-2 -mx-2 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[#a5b4fc]">{u.name?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0f172a] truncate">{u.name || u.email}</p>
                  <p className="text-[10px] text-[#94a3b8] truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PLAN_COLORS[u.plan] || PLAN_COLORS.FREE}`}>{u.plan}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
