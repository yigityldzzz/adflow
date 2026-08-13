'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Trash2, X, Loader2, Mail, Copy, Check, Crown, Shield, UserMinus, LogOut,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface Organization {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
  invites: Invite[];
}

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  OWNER:  { label: 'Owner',  icon: <Crown className="w-3 h-3" />,  color: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' },
  ADMIN:  { label: 'Admin',  icon: <Shield className="w-3 h-3" />, color: 'text-[#6366f1] bg-[#6366f1]/10 border-[#6366f1]/20' },
  MEMBER: { label: 'Member', icon: <Users className="w-3 h-3" />,  color: 'text-[#64748b] bg-[#e2e8f0] border-[#e2e8f0]' },
};

export default function TeamPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [creatingName, setCreatingName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await api.get<{ organization: Organization | null; myRole?: string }>('/api/organizations/me');
      setOrg(res.organization);
      setMyRole(res.myRole ?? null);
    } catch {
      toast({ type: 'error', title: 'Failed to load team' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!creatingName.trim() || creating) return;
    setCreating(true);
    try {
      await api.post('/api/organizations', { name: creatingName.trim() });
      toast({ type: 'success', title: 'Team created!' });
      setCreatingName('');
      fetchOrg();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to create team' });
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      const res = await api.post<{ inviteUrl: string }>('/api/organizations/invite', { email: inviteEmail.trim(), role: inviteRole });
      setLastInviteUrl(res.inviteUrl);
      setInviteEmail('');
      toast({ type: 'success', title: 'Invite created', description: 'Share the link below with your teammate.' });
      fetchOrg();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to create invite' });
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      await api.delete(`/api/organizations/invite/${id}`);
      toast({ type: 'success', title: 'Invite revoked' });
      fetchOrg();
    } catch {
      toast({ type: 'error', title: 'Failed to revoke invite' });
    }
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this teammate? They will lose access to shared campaigns.')) return;
    try {
      await api.delete(`/api/organizations/members/${userId}`);
      toast({ type: 'success', title: 'Member removed' });
      fetchOrg();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to remove member' });
    }
  }

  async function changeRole(userId: string, role: 'ADMIN' | 'MEMBER') {
    try {
      await api.patch(`/api/organizations/members/${userId}`, { role });
      toast({ type: 'success', title: 'Role updated' });
      fetchOrg();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to update role' });
    }
  }

  async function leaveTeam() {
    if (!confirm('Leave this team? You will lose access to shared campaigns.')) return;
    try {
      await api.post('/api/organizations/leave', {});
      toast({ type: 'success', title: 'You left the team' });
      fetchOrg();
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to leave team' });
    }
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl h-40 skeleton" />
      </div>
    );
  }

  // ── No team yet ──────────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Team</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Share campaigns, links, and alerts with teammates.</p>
        </div>
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-[#6366f1]" />
          </div>
          <p className="text-base font-semibold text-[#0f172a] mb-1">You&apos;re not on a team yet</p>
          <p className="text-sm text-[#94a3b8] mb-6 max-w-sm mx-auto">
            Create a team to give teammates shared access to your campaigns, links, offers, and alerts.
          </p>
          <form onSubmit={handleCreate} className="flex gap-2 max-w-xs mx-auto">
            <input
              type="text" value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              placeholder="Team name"
              className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
            />
            <button
              type="submit" disabled={creating}
              className="flex items-center justify-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Has a team ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">{org.name}</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {org.members.length} member{org.members.length !== 1 ? 's' : ''} · your role: {myRole}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => { setShowInvite(true); setLastInviteUrl(null); }}
              className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
            >
              <Mail className="w-4 h-4" />
              Invite Teammate
            </button>
          )}
          {myRole !== 'OWNER' && (
            <button
              onClick={leaveTeam}
              className="inline-flex items-center gap-2 border border-[#e2e8f0] bg-[#ffffff] hover:bg-[#fef2f2] hover:border-[#ef4444]/30 hover:text-[#ef4444] text-[#64748b] text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave Team
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#6366f1]" />
          <h3 className="text-sm font-semibold text-[#0f172a]">Members</h3>
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          {org.members.map((m) => {
            const rm = ROLE_META[m.role];
            return (
              <div key={m.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366f1]/20 to-[#8b5cf6]/20 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[#6366f1]">{m.user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a] truncate">{m.user.name}</p>
                  <p className="text-xs text-[#94a3b8] truncate">{m.user.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rm.color}`}>
                  {rm.icon} {rm.label}
                </span>
                {myRole === 'OWNER' && m.role !== 'OWNER' && (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                    className="text-xs bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[#64748b] focus:outline-none focus:border-[#6366f1]"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}
                {canManage && m.role !== 'OWNER' && (
                  <button onClick={() => removeMember(m.userId)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors" title="Remove">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {canManage && org.invites.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Pending Invites</h3>
          </div>
          <div className="divide-y divide-[#e2e8f0]">
            {org.invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f172a] truncate">{inv.email}</p>
                  <p className="text-xs text-[#94a3b8]">Invited as {inv.role.toLowerCase()} · expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => revokeInvite(inv.id)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors" title="Revoke">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#0f172a]">Invite Teammate</h3>
              <button onClick={() => setShowInvite(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!lastInviteUrl ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email address</label>
                  <input
                    type="email" required value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#6366f1] transition-colors"
                  >
                    <option value="MEMBER">Member — can view and manage shared resources</option>
                    <option value="ADMIN">Admin — can also invite/remove teammates</option>
                  </select>
                </div>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  AdFlow doesn&apos;t send email yet — you&apos;ll get a shareable invite link to send yourself (Slack, email, WhatsApp, etc).
                </p>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviting} className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Create Invite
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                  <p className="text-sm font-semibold text-[#10b981] mb-1">Invite created!</p>
                  <p className="text-xs text-[#64748b]">Copy this link and send it to your teammate.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly value={lastInviteUrl}
                    className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-xs font-mono text-[#64748b]"
                  />
                  <button
                    onClick={() => copyInviteUrl(lastInviteUrl)}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-xl transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => setShowInvite(false)}
                  className="w-full py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
