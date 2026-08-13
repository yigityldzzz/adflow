import { Router, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getMembership(userId: string) {
  return prisma.organizationMember.findUnique({ where: { userId } });
}

// GET /api/organizations/me — current user's org, members, and pending invites
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const membership = await getMembership(req.user!.id);
  if (!membership) {
    res.json({ organization: null });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      invites: { where: { acceptedAt: null }, orderBy: { createdAt: 'desc' } },
    },
  });

  res.json({
    organization: org,
    myRole: membership.role,
  });
});

// POST /api/organizations — create an org (fails if already in one)
const createOrgSchema = z.object({ name: z.string().min(1).max(100) });

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createOrgSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const existing = await getMembership(req.user!.id);
  if (existing) {
    res.status(409).json({ error: 'You are already part of a team. Leave it before creating a new one.' });
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: parse.data.name,
      ownerId: req.user!.id,
      members: { create: { userId: req.user!.id, role: 'OWNER' } },
    },
    include: { members: true },
  });

  res.status(201).json({ organization: org });
});

// PATCH /api/organizations — rename (owner/admin only)
router.patch('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createOrgSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }
  const membership = await getMembership(req.user!.id);
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only team owners/admins can rename the team' });
    return;
  }
  const org = await prisma.organization.update({ where: { id: membership.organizationId }, data: { name: parse.data.name } });
  res.json({ organization: org });
});

// POST /api/organizations/invite — invite a teammate by email
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

router.post('/invite', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = inviteSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const membership = await getMembership(req.user!.id);
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only team owners/admins can invite people' });
    return;
  }

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: membership.organizationId,
      email: parse.data.email.toLowerCase(),
      role: parse.data.role,
      token: randomBytes(24).toString('base64url'),
      invitedBy: req.user!.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    },
  });

  const base = process.env.WEB_BASE_URL ?? 'https://adflow.digitaladexpert.de';
  res.status(201).json({
    invite,
    inviteUrl: `${base}/team/accept?token=${invite.token}`,
  });
});

// GET /api/organizations/invite/:token — preview an invite before accepting
router.get('/invite/:token', async (req: AuthRequest, res: Response): Promise<void> => {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token: req.params.token },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    res.status(404).json({ error: 'Invite not found or expired' });
    return;
  }
  res.json({ invite });
});

// POST /api/organizations/invite/:token/accept
router.post('/invite/:token/accept', async (req: AuthRequest, res: Response): Promise<void> => {
  const invite = await prisma.organizationInvite.findUnique({ where: { token: req.params.token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    res.status(404).json({ error: 'Invite not found or expired' });
    return;
  }
  if (invite.email.toLowerCase() !== req.user!.email.toLowerCase()) {
    res.status(403).json({ error: 'This invite was sent to a different email address' });
    return;
  }

  const existing = await getMembership(req.user!.id);
  if (existing) {
    res.status(409).json({ error: 'You are already part of a team. Leave it before joining another.' });
    return;
  }

  await prisma.$transaction([
    prisma.organizationMember.create({
      data: { organizationId: invite.organizationId, userId: req.user!.id, role: invite.role },
    }),
    prisma.organizationInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  res.json({ ok: true });
});

// DELETE /api/organizations/invite/:id — revoke a pending invite
router.delete('/invite/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const membership = await getMembership(req.user!.id);
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only team owners/admins can revoke invites' });
    return;
  }
  await prisma.organizationInvite.deleteMany({ where: { id: req.params.id, organizationId: membership.organizationId } });
  res.json({ ok: true });
});

// PATCH /api/organizations/members/:userId — change a member's role (owner only)
router.patch('/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const roleSchema = z.object({ role: z.enum(['ADMIN', 'MEMBER']) });
  const parse = roleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const membership = await getMembership(req.user!.id);
  if (!membership || membership.role !== 'OWNER') {
    res.status(403).json({ error: 'Only the team owner can change roles' });
    return;
  }
  if (req.params.userId === req.user!.id) {
    res.status(400).json({ error: "You can't change your own role" });
    return;
  }

  const target = await prisma.organizationMember.findFirst({
    where: { userId: req.params.userId, organizationId: membership.organizationId },
  });
  if (!target) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const updated = await prisma.organizationMember.update({ where: { id: target.id }, data: { role: parse.data.role } });
  res.json({ member: updated });
});

// DELETE /api/organizations/members/:userId — remove a teammate
router.delete('/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const membership = await getMembership(req.user!.id);
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only team owners/admins can remove members' });
    return;
  }

  const target = await prisma.organizationMember.findFirst({
    where: { userId: req.params.userId, organizationId: membership.organizationId },
  });
  if (!target) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  if (target.role === 'OWNER') {
    res.status(400).json({ error: 'Cannot remove the team owner. Transfer ownership first.' });
    return;
  }

  await prisma.organizationMember.delete({ where: { id: target.id } });
  res.json({ ok: true });
});

// POST /api/organizations/leave — leave your current team (owner must transfer or delete instead)
router.post('/leave', async (req: AuthRequest, res: Response): Promise<void> => {
  const membership = await getMembership(req.user!.id);
  if (!membership) {
    res.status(404).json({ error: 'You are not part of a team' });
    return;
  }
  if (membership.role === 'OWNER') {
    res.status(400).json({ error: 'Owners cannot leave — delete the team or transfer ownership instead' });
    return;
  }
  await prisma.organizationMember.delete({ where: { id: membership.id } });
  res.json({ ok: true });
});

export default router;
