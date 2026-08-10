import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const METRICS = ['clicks', 'conversions', 'revenue', 'bot_rate', 'cpa'] as const;
const CONDITIONS = ['above', 'below'] as const;

const alertSchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.enum(METRICS),
  condition: z.enum(CONDITIONS),
  threshold: z.number().min(0),
  enabled: z.boolean().optional().default(true),
  webhookUrl: z.string().url().optional().or(z.literal('')),
});

// GET /api/alerts
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ alerts });
});

// POST /api/alerts
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = alertSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }
  const alert = await prisma.alert.create({
    data: { ...parse.data, userId: req.user!.id },
  });
  res.status(201).json({ alert });
});

// PATCH /api/alerts/:id
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  const parse = alertSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: parse.data,
  });
  res.json({ alert });
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  await prisma.alert.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /api/alerts/evaluate — check all alerts against current metrics
router.post('/evaluate', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalClicks, botClicks, totalConversions, conversionValues, alerts] = await Promise.all([
    prisma.click.count({ where: { userId, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.click.count({ where: { userId, isBot: true, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.conversion.count({ where: { userId, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.conversion.findMany({ where: { userId, timestamp: { gte: thirtyDaysAgo } }, select: { value: true } }),
    prisma.alert.findMany({ where: { userId, enabled: true } }),
  ]);

  const revenue = conversionValues.reduce((s, c) => s + c.value, 0);
  const botRate = totalClicks > 0 ? (botClicks / totalClicks) * 100 : 0;
  const totalSpend = await prisma.campaign.aggregate({ where: { userId }, _sum: { budget: true } }).then((r) => r._sum.budget ?? 0);
  const cpa = totalConversions > 0 && totalSpend > 0 ? totalSpend / totalConversions : 0;

  const currentValues: Record<string, number> = {
    clicks: totalClicks,
    conversions: totalConversions,
    revenue,
    bot_rate: botRate,
    cpa,
  };

  const results = await Promise.all(
    alerts.map(async (alert) => {
      const current = currentValues[alert.metric] ?? 0;
      const triggered =
        alert.condition === 'above' ? current > alert.threshold : current < alert.threshold;

      await prisma.alert.update({
        where: { id: alert.id },
        data: { triggered, lastChecked: now },
      });

      return { ...alert, triggered, currentValue: current };
    })
  );

  res.json({ alerts: results });
});

export default router;
