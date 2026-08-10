import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Plan, Role } from '@prisma/client';

const router = Router();

const BCRYPT_ROUNDS = 12;
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
  });
}

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}

function getEffectivePlan(user: { plan: Plan; trialPlan?: Plan | null; trialEndsAt?: Date | null }): Plan {
  if (user.trialPlan && user.trialEndsAt && user.trialEndsAt > new Date()) {
    return user.trialPlan;
  }
  return user.plan;
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

  const user = await prisma.user.create({
    data: { email, password: hashed, name },
    select: { id: true, email: true, name: true, plan: true, role: true, createdAt: true },
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, plan: user.plan, role: user.role });
  const refreshTokenValue = signRefreshToken({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  res.status(201).json({ user, accessToken, refreshToken: refreshTokenValue });
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
    select: { id: true, email: true, name: true, plan: true, role: true, createdAt: true, trialPlan: true, trialEndsAt: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Auto-expire trial
  if (user.trialPlan && user.trialEndsAt && user.trialEndsAt <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { trialPlan: null, trialEndsAt: null },
    });
    user.trialPlan = null;
    user.trialEndsAt = null;
  }

  const effectivePlan = getEffectivePlan(user);
  const trialActive = !!(user.trialPlan && user.trialEndsAt && user.trialEndsAt > new Date());

  res.json({
    user: {
      ...user,
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
