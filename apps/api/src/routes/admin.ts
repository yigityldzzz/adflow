import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getSubscription, planForVariant } from '../services/lemonsqueezy';
import { issuePasswordReset } from '../services/passwordReset';

const router = Router();
router.use(authenticate);

// Admin role guard
router.use((req: AuthRequest, res: Response, next) => {
  if ((req.user as { role?: string })?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
});

// GET /api/admin/overview
router.get('/overview', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalUsers, planCounts, totalClicks, totalConversions, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['plan'], _count: { id: true } }),
    prisma.click.count({ where: { isBot: false } }),
    prisma.conversion.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, plan: true, createdAt: true },
    }),
  ]);

  const plans = { FREE: 0, PRO: 0, TEAM: 0 };
  for (const p of planCounts) plans[p.plan] = p._count.id;

  res.json({ totalUsers, plans, totalClicks, totalConversions, recentUsers });
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const search = String(req.query.search ?? '');
  const plan = String(req.query.plan ?? '');
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const offset = parseInt(String(req.query.offset ?? '0'), 10);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (plan && ['FREE', 'PRO', 'TEAM'].includes(plan.toUpperCase())) {
    where.plan = plan.toUpperCase();
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        suspended: true,
        createdAt: true,
        lastActiveAt: true,
        lsStatus: true,
        _count: { select: { links: true, campaigns: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const enriched = await Promise.all(
    users.map(async (u) => {
      const [clicks, conversions] = await Promise.all([
        prisma.click.count({ where: { userId: u.id, isBot: false } }),
        prisma.conversion.count({ where: { userId: u.id } }),
      ]);
      return { ...u, clicks, conversions };
    })
  );

  res.json({ users: enriched, total, limit, offset });
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, plan: true, role: true,
      suspended: true, notes: true, createdAt: true,
      trialPlan: true, trialEndsAt: true, lastLoginAt: true, lastActiveAt: true,
      lsStatus: true, lsSubscriptionId: true, lsCustomerId: true, lsVariantId: true,
      links: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { clicks: { where: { isBot: false } }, conversions: true } } },
      },
      campaigns: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, source: true, status: true, createdAt: true } },
      _count: { select: { links: true, campaigns: true, conversions: true } },
    },
  });

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const [totalClicks, totalConversions, revenue] = await Promise.all([
    prisma.click.count({ where: { userId: id, isBot: false } }),
    prisma.conversion.count({ where: { userId: id } }),
    prisma.conversion.aggregate({ where: { userId: id }, _sum: { value: true } }),
  ]);

  // Live Lemon Squeezy view of the subscription (dates, card). Falls back to
  // the stored status if Lemon Squeezy can't be reached or doesn't know it.
  let subscription: Record<string, unknown> | null = null;
  if (user.lsSubscriptionId) {
    subscription = {
      id: user.lsSubscriptionId,
      status: user.lsStatus,
      plan: user.lsVariantId ? planForVariant(user.lsVariantId) : null,
      live: false,
    };
    try {
      const sub = await getSubscription(user.lsSubscriptionId);
      if (sub) {
        subscription = {
          id: user.lsSubscriptionId,
          status: sub.status,
          plan: planForVariant(sub.variantId),
          renewsAt: sub.renewsAt,
          endsAt: sub.endsAt,
          trialEndsAt: sub.trialEndsAt,
          cardBrand: sub.cardBrand,
          cardLastFour: sub.cardLastFour,
          live: true,
        };
      }
    } catch (err) {
      console.error('[admin/users/:id] subscription fetch', err);
    }
  }

  res.json({
    user: {
      ...user,
      subscription,
      stats: {
        totalClicks,
        totalConversions,
        revenue: Math.round((revenue._sum.value ?? 0) * 100) / 100,
        totalLinks: user._count.links,
        totalCampaigns: user._count.campaigns,
      },
    },
  });
});

// PATCH /api/admin/users/:id
const updateUserSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'TEAM']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  suspended: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

router.patch('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const updated = await prisma.user.update({
    where: { id },
    data: parse.data,
    select: { id: true, name: true, email: true, plan: true, role: true, suspended: true, notes: true },
  });

  if (parse.data.suspended === true && !user.suspended) {
    // Revoke every session; the user is signed out within one access-token
    // lifetime (15 min) and can't sign back in.
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
  }
  if (parse.data.suspended !== undefined && parse.data.suspended !== user.suspended) {
    console.log(`[ADMIN] ${req.user!.id} ${parse.data.suspended ? 'suspended' : 'unsuspended'} user ${id}`);
  }
  if (parse.data.plan && parse.data.plan !== user.plan) {
    console.log(`[ADMIN] ${req.user!.id} changed plan of user ${id}: ${user.plan} -> ${parse.data.plan}`);
  }

  res.json({ user: updated });
});

// POST /api/admin/users/:id/password-reset — email the user a reset link
router.post('/users/:id/password-reset', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, suspended: true } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.suspended) { res.status(400).json({ error: 'User is suspended' }); return; }

  const result = await issuePasswordReset(user);
  console.log(`[ADMIN] ${req.user!.id} sent password reset to user ${id}: ${result}`);

  if (result === 'throttled') {
    res.status(429).json({ error: 'A reset email was sent less than a minute ago' });
    return;
  }
  if (result === 'failed') {
    res.status(502).json({ error: 'Could not send the email' });
    return;
  }
  res.json({ ok: true });
});

// POST /api/admin/users/:id/trial
const trialSchema = z.object({
  plan: z.enum(['PRO', 'TEAM']),
  days: z.number().int().min(1).max(90),
});

router.post('/users/:id/trial', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const parse = trialSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + parse.data.days);

  const updated = await prisma.user.update({
    where: { id },
    data: { trialPlan: parse.data.plan as never, trialEndsAt },
    select: { id: true, email: true, plan: true, trialPlan: true, trialEndsAt: true },
  });

  console.log(`[TRIAL] Admin ${req.user!.id} set ${parse.data.days}d ${parse.data.plan} trial for user ${id}`);
  res.json({ user: updated });
});

// DELETE /api/admin/users/:id/trial
router.delete('/users/:id/trial', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  await prisma.user.update({
    where: { id },
    data: { trialPlan: null, trialEndsAt: null },
  });

  res.json({ ok: true });
});

// POST /api/admin/users/:id/impersonate
router.post('/users/:id/impersonate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminId = req.user!.id;

  if (id === adminId) {
    res.status(400).json({ error: 'Cannot impersonate yourself' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, plan: true, role: true, suspended: true },
  });

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.suspended) { res.status(403).json({ error: 'Cannot impersonate a suspended user' }); return; }

  const secret = process.env.JWT_SECRET;
  if (!secret) { res.status(500).json({ error: 'Server misconfigured' }); return; }

  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign(
    { id: user.id, email: user.email, plan: user.plan, role: user.role, impersonatedBy: adminId },
    secret,
    { expiresIn: '15m' }
  );

  console.log(`[IMPERSONATE] Admin ${adminId} → User ${user.id} (${user.email}) at ${new Date().toISOString()}`);

  res.json({ token, user: { id: user.id, email: user.email, name: user.email } });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminId = req.user!.id;

  if (id === adminId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
