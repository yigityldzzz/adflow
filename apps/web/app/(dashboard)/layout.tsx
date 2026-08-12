'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Megaphone,
  Link2,
  BarChart3,
  Target,
  FileText,
  Bell,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Zap,
  Wrench,
  Crown,
  Share2,
  Gift,
  Layout,
  GitBranch,
  MousePointerClick,
} from 'lucide-react';
import { api } from '@/lib/api';
import { clearAuth, getToken, isImpersonating, stopImpersonation } from '@/lib/auth';
import { ToastContainer } from '@/components/Toast';

interface User {
  id: string;
  name: string;
  email: string;
  plan?: string;
  role?: string;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const NOTIFICATIONS_POLL_MS = 45000;

function notificationTimeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const NAV_ITEMS = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/campaigns',   icon: Megaphone,        label: 'Campaigns' },
  { href: '/traffic-sources', icon: Share2, label: 'Traffic Sources' },
  { href: '/offers',      icon: Gift,             label: 'Offers' },
  { href: '/landers',     icon: Layout,           label: 'Landers' },
  { href: '/flows',       icon: GitBranch,        label: 'Flows' },
  { href: '/links',       icon: Link2,            label: 'Links' },
  { href: '/analytics',   icon: BarChart3,           label: 'Analytics' },
  { href: '/clicks',      icon: MousePointerClick,   label: 'Click Log' },
  { href: '/conversions', icon: Target,              label: 'Conversions' },
  { href: '/reports',     icon: FileText,         label: 'Reports' },
  { href: '/alerts',       icon: Bell,             label: 'Alerts' },
  { href: '/utm-builder',  icon: Wrench,           label: 'UTM Builder' },
  { href: '/settings',     icon: Settings,         label: 'Settings' },
];

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-[#e2e8f0] text-[#64748b]',
  pro: 'bg-[#6366f1]/20 text-[#a5b4fc]',
  team: 'bg-[#8b5cf6]/20 text-[#c4b5fd]',
};

const SIDEBAR_COLLAPSE_KEY = 'adflow_sidebar_collapsed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapseLoaded, setCollapseLoaded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImpersonating(isImpersonating());
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications?limit=20');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, NOTIFICATIONS_POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markNotificationRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.post(`/api/notifications/${id}/read`, {});
    } catch {
      // best-effort
    }
  }

  async function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post('/api/notifications/read-all', {});
    } catch {
      // best-effort
    }
  }

  // Restore sidebar collapse preference
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    if (stored === '1') setCollapsed(true);
    setCollapseLoaded(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch {
      // If 401, api.ts will redirect to /login automatically
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    fetchUser();
  }, [fetchUser, router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const currentPage = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  const pageTitle = currentPage?.label || 'Dashboard';

  const plan = user?.plan || 'free';
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-[#e2e8f0] flex-shrink-0 ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-base font-bold text-[#0f172a] tracking-tight whitespace-nowrap">
            Ad<span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Flow</span>
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all duration-150 group ${
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/20'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]/60'
              }`}
            >
              <item.icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#6366f1]' : 'text-[#94a3b8] group-hover:text-[#64748b]'
                }`}
              />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              {!isCollapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto text-[#6366f1]/60" />}
            </Link>
          );
        })}
        {user?.role === 'ADMIN' && (
          <>
            <div className="my-2 border-t border-[#e2e8f0]" />
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              title={isCollapsed ? 'Admin' : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all duration-150 group ${
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                pathname.startsWith('/admin')
                  ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                  : 'text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/5'
              }`}
            >
              <Crown className={`w-4 h-4 flex-shrink-0 ${pathname.startsWith('/admin') ? 'text-[#ef4444]' : 'text-[#94a3b8] group-hover:text-[#ef4444]'}`} />
              {!isCollapsed && <span className="whitespace-nowrap">Admin</span>}
              {!isCollapsed && pathname.startsWith('/admin') && <ChevronRight className="w-3 h-3 ml-auto text-[#ef4444]/60" />}
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade prompt if free */}
      {plan === 'free' && !isCollapsed && (
        <div className="mx-3 mb-3 p-3.5 bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 border border-[#6366f1]/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#6366f1]" />
            <p className="text-xs font-semibold text-[#0f172a]">Upgrade to Pro</p>
          </div>
          <p className="text-[10px] text-[#64748b] mb-2.5 leading-relaxed">
            Unlock unlimited links, AI insights, and 1M clicks/month.
          </p>
          <button className="w-full text-xs font-medium bg-[#6366f1] hover:bg-[#5558e3] text-white py-1.5 rounded-lg transition-colors">
            Upgrade for $49/mo
          </button>
        </div>
      )}

      {/* User info */}
      <div className="flex-shrink-0 border-t border-[#e2e8f0] p-3">
        {user ? (
          <div className={`flex items-center rounded-xl hover:bg-[#e2e8f0] transition-colors group ${isCollapsed ? 'justify-center py-2' : 'gap-3 px-2 py-2'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0" title={isCollapsed ? user.name : undefined}>
              <span className="text-xs font-semibold text-[#a5b4fc]">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0f172a] truncate">{user.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}>
                    {planLabel}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[#94a3b8] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-3 px-2 py-2'}`}>
            <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 skeleton rounded" />
                <div className="h-2.5 w-16 skeleton rounded" />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  const handleReturnToAdmin = () => {
    stopImpersonation();
    router.push('/admin/users');
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#ffffff] border-r border-[#e2e8f0] flex-shrink-0 relative ${
          collapseLoaded ? 'transition-[width] duration-200 ease-in-out' : ''
        } ${collapsed ? 'w-[72px]' : 'w-60'}`}
      >
        <SidebarContent isCollapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#ffffff] border border-[#e2e8f0] shadow-md items-center justify-center text-[#94a3b8] hover:text-[#6366f1] hover:border-[#6366f1]/40 transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-60 bg-[#ffffff] border-r border-[#e2e8f0] z-10 h-full">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-[#e2e8f0] bg-[#ffffff]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#94a3b8] hover:text-[#64748b] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-[#0f172a]">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:border-[#cbd5e1] transition-colors text-[#94a3b8] hover:text-[#64748b]"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-[3px] flex items-center justify-center bg-[#ef4444] rounded-full text-[9px] font-bold text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 max-h-[420px] overflow-y-auto bg-[#ffffff] border border-[#e2e8f0] rounded-xl shadow-2xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] sticky top-0 bg-[#ffffff]">
                    <span className="text-sm font-semibold text-[#0f172a]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-[#6366f1] hover:text-[#5558e3] font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => !n.read && markNotificationRead(n.id)}
                        className={`block w-full text-left px-4 py-3 border-b border-[#e2e8f0]/60 last:border-b-0 transition-colors ${
                          n.read ? 'bg-[#ffffff] hover:bg-[#f8fafc]' : 'bg-[#6366f1]/5 hover:bg-[#6366f1]/10'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />}
                          <div className={n.read ? 'flex-1 min-w-0' : 'flex-1 min-w-0 -ml-0'}>
                            <p className="text-xs font-semibold text-[#0f172a] mb-0.5">{n.title}</p>
                            <p className="text-[11px] text-[#64748b] leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-[#94a3b8] mt-1">{notificationTimeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* New Campaign */}
            <Link
              href="/campaigns"
              className="hidden sm:flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Link>
          </div>
        </header>

        {/* Impersonation banner */}
        {impersonating && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 bg-[#ef4444]/10 border-b border-[#ef4444]/20">
            <div className="flex items-center gap-2 text-xs text-[#ef4444]">
              <Crown className="w-3.5 h-3.5" />
              <span className="font-semibold">Admin Modu:</span>
              <span>{user?.email} olarak görüntülüyorsunuz</span>
            </div>
            <button
              onClick={handleReturnToAdmin}
              className="text-xs font-semibold text-[#ef4444] hover:text-white bg-[#ef4444]/20 hover:bg-[#ef4444] border border-[#ef4444]/30 px-3 py-1 rounded-lg transition-colors"
            >
              Admin'e Dön
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
