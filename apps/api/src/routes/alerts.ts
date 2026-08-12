import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const METRICS = ['clicks', 'conversions', 'revenue', 'bot_rate', 'cpa'] as const;
const CONDITIONS = ['above', 'below'] as const;
const ACTIONS = ['notify', 'pause_campaign'] as const;

const alertBaseSchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.enum(METRICS),
  condition: z.enum(CONDITIONS),
  threshold: z.number().min(0),
  enabled: z.boolean().optional().default(true),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  campaignId: z.string().optional().nullable(),
  action: z.enum(ACTIONS).optional().default('notify'),
});

const alertSchema = alertBaseSchema.refine((data) => data.action !== 'pause_campaign' || !!data.campaignId, {
  message: 'Auto-pause requires a specific campaign to be selected',
  path: ['action'],
});

const alertUpdateSchema = alertBaseSchema.partial().refine(
  (data) => data.action !== 'pause_campaign' || !!data.campaignId,
  { message: 'Auto-pause requires a specific campaign to be selected', path: ['action'] }
);

// GET /api/alerts
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { campaign: { select: { id: true, name: true, status: true } } },
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

  if (parse.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: parse.data.campaignId, userId: req.user!.id } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
  }

  const alert = await prisma.alert.create({
    data: { ...parse.data, userId: req.user!.id },
    include: { campaign: { select: { id: true, name: true, status: true } } },
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
  const parse = alertUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  if (parse.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: parse.data.campaignId, userId: req.user!.id } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
  }

  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: parse.data,
    include: { campaign: { select: { id: true, name: true, status: true } } },
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

// POST /api/alerts/evaluate — on-demand check of all of the user's alerts
// against current metrics (account-wide or campaign-scoped). Mirrors the
// background checkAllAlerts() job so a manual visit to the Alerts page gets
// fresh state immediately instead of waiting for the next 5-minute tick.
router.post('/evaluate', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const alerts = await prisma.alert.findMany({
    where: { userId, enabled: true },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  });

  const results = await Promise.all(
    alerts.map(async (alert) => {
      const clickWhere = alert.campaignId
        ? { userId, campaignId: alert.campaignId, timestamp: { gte: since } }
        : { userId, timestamp: { gte: since } };
      const convWhere = alert.campaignId
        ? { userId, timestamp: { gte: since }, click: { campaignId: alert.campaignId } }
        : { userId, timestamp: { gte: since } };

      const [clicks, botClicks, conversions, conversionValues, spend] = await Promise.all([
        prisma.click.count({ where: clickWhere }),
        prisma.click.count({ where: { ...clickWhere, isBot: true } }),
        prisma.conversion.count({ where: convWhere }),
        prisma.conversion.findMany({ where: convWhere, select: { value: true } }),
        alert.campaignId
          ? prisma.campaign.findUnique({ where: { id: alert.campaignId }, select: { cost: true } }).then((c) => c?.cost ?? 0)
          : prisma.campaign.aggregate({ where: { userId }, _sum: { cost: true } }).then((r) => r._sum.cost ?? 0),
      ]);

      const revenue = conversionValues.reduce((s, c) => s + c.value, 0);
      const botRate = clicks > 0 ? (botClicks / clicks) * 100 : 0;
      const cpa = conversions > 0 && spend > 0 ? spend / conversions : 0;

      const currentValues: Record<string, number> = { clicks, conversions, revenue, bot_rate: botRate, cpa };
      const current = currentValues[alert.metric] ?? 0;
      const triggered = alert.condition === 'above' ? current > alert.threshold : current < alert.threshold;
      const wasTriggered = alert.triggered;

      await prisma.alert.update({ where: { id: alert.id }, data: { triggered, lastChecked: now } });

      if (triggered && !wasTriggered) {
        const scopeLabel = alert.campaign ? ` (${alert.campaign.name})` : '';
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            type: 'alert_triggered',
            title: `Alert triggered: ${alert.name}${scopeLabel}`,
            message: `${alert.metric} is ${alert.condition} ${alert.threshold} (current: ${Math.round(current * 100) / 100}).`,
          },
        }).catch(() => {});

        if (alert.action === 'pause_campaign' && alert.campaignId && alert.campaign?.status === 'ACTIVE') {
          await prisma.campaign.update({ where: { id: alert.campaignId }, data: { status: 'PAUSED' } }).catch(() => {});
          await prisma.notification.create({
            data: {
              userId: alert.userId,
              type: 'campaign_auto_paused',
              title: `Campaign auto-paused: ${alert.campaign.name}`,
              message: `AdFlow stopped forwarding clicks for this campaign because "${alert.name}" triggered. Re-activate it from the Campaigns page when ready.`,
            },
          }).catch(() => {});
        }
      }

      return { ...alert, triggered, currentValue: current };
    })
  );

  res.json({ alerts: results });
});

export default router;
