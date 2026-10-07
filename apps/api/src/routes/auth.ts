import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Plan, Role } from '@prisma/client';
import { sendMail } from '../services/mailer';
import { welcomeEmail, passwordChangedEmail } from '../services/emailTemplates';
import { hashResetToken, issuePasswordReset } from '../services/passwordReset';
import { getEffectivePlan } from '../services/planAccess';
import { expireTrial } from '../services/trialLifecycle';

const router = Router();

const BCRYPT_ROUNDS = 12;
const SUSPENDED_MESSAGE = 'This account is suspended. Please contact info@digitaladexpert.de.';
// GET /me runs on every dashboard page load; only write lastActiveAt when
// the stored value is older than this.
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function signAccessToken(payload: { id: string; email: string; plan: Plan; role: Role }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES });
}

function signRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d`,
    // Random id so two tokens issued in the same second still differ —
    // otherwise rotation could hand back the token it just revoked.
    jwtid: randomBytes(16).toString('hex'),
  });
}

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}


// POST /api/auth/register
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { email, password, name } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Every new signup gets a 7-day, no-card-required Pro trial. It downgrades
  // to Free automatically (getEffectivePlan / the auto-expire block in GET
  // /me) unless the user starts a real subscription first.
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const now = new Date();
  const user = await prisma.user.create({
    data: { email, password: hashed, name, trialPlan: Plan.PRO, trialEndsAt, lastLoginAt: now, lastActiveAt: now },
    select: { id: true, email: true, name: true, plan: true, role: true, createdAt: true, trialPlan: true, trialEndsAt: true },
  });

  const effectivePlan = getEffectivePlan(user);
  const accessToken = signAccessToken({ id: user.id, email: user.email, plan: effectivePlan, role: user.role });
  const refreshTokenValue = signRefreshToken({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  res.status(201).json({
    user: { ...user, plan: effectivePlan, trial: { plan: user.trialPlan, endsAt: user.trialEndsAt } },
    accessToken,
    refreshToken: refreshTokenValue,
  });

  // After responding — signup never waits on (or fails because of) mail.
  void sendMail(user.email, welcomeEmail({ name: user.name, trialEndsAt }));
});

// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Checked only after the password, so the response doesn't reveal to a
  // stranger that an account exists or is suspended.
  if (user.suspended) {
    res.status(403).json({ error: SUSPENDED_MESSAGE });
    return;
  }

  const now = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now, lastActiveAt: now } });

  const effectivePlan = getEffectivePlan(user);
  const accessToken = signAccessToken({ id: user.id, email: user.email, plan: effectivePlan, role: user.role });
  const refreshTokenValue = signRefreshToken({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  const { password: _pw, ...userOut } = user;
  void _pw;

  res.json({ user: { ...userOut, plan: effectivePlan }, accessToken, refreshToken: refreshTokenValue });
});

// POST /api/auth/refresh
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  const { refreshToken } = parse.data;

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  if (stored.user.suspended) {
    await prisma.refreshToken.deleteMany({ where: { userId: stored.user.id } });
    res.status(401).json({ error: SUSPENDED_MESSAGE });
    return;
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const effectivePlan = getEffectivePlan(stored.user);
  const newAccessToken = signAccessToken({
    id: stored.user.id,
    email: stored.user.email,
    plan: effectivePlan,
    role: stored.user.role,
  });
  const newRefreshToken = signRefreshToken({ id: stored.user.id });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: stored.user.id,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  const { refreshToken } = parse.data;

  await prisma.refreshToken
    .delete({ where: { token: refreshToken } })
    .catch(() => {
      // Token not found — already logged out, ignore
    });

  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, plan: true, role: true, createdAt: true, trialPlan: true, trialEndsAt: true,
      suspended: true, lastActiveAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // 401 (not 403) so the dashboard signs the user out right away.
  if (user.suspended && !req.user!.impersonatedBy) {
    res.status(401).json({ error: SUSPENDED_MESSAGE });
    return;
  }

  // An admin viewing the account via "Login as user" isn't customer activity.
  if (!req.user!.impersonatedBy && (!user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > ACTIVITY_WRITE_INTERVAL_MS)) {
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }

  // Auto-expire trial (also sends the one-time "trial ended" email)
  if (user.trialPlan && user.trialEndsAt && user.trialEndsAt <= new Date()) {
    await expireTrial(user.id);
    user.trialPlan = null;
    user.trialEndsAt = null;
  }

  const effectivePlan = getEffectivePlan(user);
  const trialActive = !!(user.trialPlan && user.trialEndsAt && user.trialEndsAt > new Date());
  const { suspended: _suspended, lastActiveAt: _lastActiveAt, ...userOut } = user;
  void _suspended;
  void _lastActiveAt;

  res.json({
    user: {
      ...userOut,
      plan: effectivePlan,
      trial: trialActive ? { plan: user.trialPlan, endsAt: user.trialEndsAt } : null,
    },
  });
});

// PATCH /api/auth/me
const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  currentPassword: z.string().min(1).optional(),
});

router.patch('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = updateMeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { name, password, currentPassword } = parse.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updateData: { name?: string; password?: string } = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (password !== undefined) {
    if (!currentPassword) {
      res.status(400).json({ error: 'currentPassword required to change password' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: updateData,
    select: { id: true, email: true, name: true, plan: true, createdAt: true },
  });

  res.json({ user: updated });

  if (updateData.password) {
    void sendMail(updated.email, passwordChangedEmail({ name: updated.name, email: updated.email }));
  }
});

// POST /api/auth/forgot-password
// Always answers the same way so it can't be used to find out which emails
// have an account; the mail itself is sent in the background.
const forgotSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: parse.data.email.trim(), mode: 'insensitive' } },
    select: { id: true, email: true, name: true, suspended: true },
  });

  res.json({ ok: true });

  if (user && !user.suspended) {
    issuePasswordReset(user)
      .then((r) => { if (r !== 'sent') console.warn(`[auth/forgot-password] reset for ${user.id}: ${r}`); })
      .catch((err) => console.error('[auth/forgot-password]', err));
  }
});

// POST /api/auth/reset-password
const resetSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const INVALID_RESET_LINK = 'This reset link is invalid or has expired. Please request a new one.';

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const parse = resetSchema.safeParse(req.body);
  if (!parse.success) {
    const pwIssue = parse.error.errors.find((e) => e.path[0] === 'password');
    res.status(400).json({ error: pwIssue?.message ?? INVALID_RESET_LINK });
    return;
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parse.data.token) },
    include: { user: { select: { id: true, email: true, name: true, suspended: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.suspended) {
    res.status(400).json({ error: INVALID_RESET_LINK });
    return;
  }

  // Claim the token atomically so two simultaneous submits can't both use it.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    res.status(400).json({ error: INVALID_RESET_LINK });
    return;
  }

  const hashed = await bcrypt.hash(parse.data.password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    // Sign out every existing session — whoever triggered the reset may
    // have been locked out by someone else using the old password.
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
  ]);

  res.json({ ok: true });

  void sendMail(record.user.email, passwordChangedEmail(record.user));
});

// GET /api/auth/api-key — get current API key
router.get('/api-key', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { apiKey: true },
  });
  res.json({ apiKey: user?.apiKey ?? null });
});

// POST /api/auth/api-key — generate (or regenerate) API key
router.post('/api-key', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const apiKey = 'af_' + randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { apiKey },
  });
  res.json({ apiKey });
});

// DELETE /api/auth/api-key — revoke API key
router.delete('/api-key', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { apiKey: null },
  });
  res.json({ ok: true });
});

export default router;
