import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CampaignStatus } from '@prisma/client';
import { limitFor } from '../config/planLimits';
import { loadEffectivePlan } from '../services/planAccess';
import { syncMetaConnection } from '../services/adAccountScheduler';
import { getTeamUserIds } from '../services/team';

const router = Router();
router.use(authenticate);

// Manual cost entry has no per-day history, so we attribute any change to
// the day it was made: today's CampaignSpend row is incremented by the
// delta (new value minus old value), which keeps date-filtered totals
// (Dashboard/Reports) consistent with the campaign's lifetime cost.
async function recordManualSpendDelta(campaignId: string, delta: number): Promise<void> {
  if (delta === 0) return;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.campaignSpend.upsert({
    where: { campaignId_date: { campaignId, date: today } },
    create: { campaignId, date: today, cost: delta },
    update: { cost: { increment: delta } },
  });
}

// GET /api/campaigns
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);

  const campaigns = await prisma.campaign.findMany({
    where: { userId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { clicks: { where: { isBot: false } } } },
      trafficSource: { select: { id: true, name: true, platform: true } },
      flow: { select: { id: true, name: true } },
      links: {
        include: {
          _count: { select: { conversions: true } },
          conversions: { select: { value: true } },
        },
      },
    },
  });

  const result = campaigns.map((c) => {
    const totalClicks = c._count.clicks;
    const conversions = c.links.flatMap((l) => l.conversions);
    const totalConversions = conversions.length;
    const revenue = conversions.reduce((s, cv) => s + cv.value, 0);
    const budget = c.budget ?? 0;
    const roas = budget > 0 && revenue > 0 ? revenue / budget : null;
    const ctr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      source: c.source,
      status: c.status,
      budget: c.budget,
      cost: c.cost,
      externalCampaignId: c.externalCampaignId,
      costSyncedAt: c.costSyncedAt,
      // The edit modal pre-fills these — without them it always showed "None".
      trafficSourceId: c.trafficSourceId,
      flowId: c.flowId,
      trafficSource: c.trafficSource,
      flow: c.flow,
      createdAt: c.createdAt,
      stats: {
        totalClicks,
        totalConversions,
        revenue: Math.round(revenue * 100) / 100,
        roas: roas !== null ? Math.round(roas * 100) / 100 : null,
        ctr: Math.round(ctr * 100) / 100,
      },
    };
  });

  res.json({ campaigns: result });
});

// POST /api/campaigns
const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.string().optional(),
  budget: z.number().positive().optional(),
  cost: z.number().min(0).optional(),
  trafficSourceId: z.string().optional().nullable(),
  flowId: z.string().optional().nullable(),
  externalCampaignId: z.string().optional().nullable(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createCampaignSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const userId = req.user!.id;
  const limits = limitFor(await loadEffectivePlan(userId));
  if (limits.maxCampaigns !== null) {
    const teamIds = await getTeamUserIds(userId);
    const campaignCount = await prisma.campaign.count({ where: { userId: { in: teamIds } } });
    if (campaignCount >= limits.maxCampaigns) {
      res.status(403).json({
        error: `Your plan is limited to ${limits.maxCampaigns} campaign${limits.maxCampaigns === 1 ? '' : 's'}. Upgrade to Pro for unlimited campaigns.`,
        code: 'PLAN_LIMIT_REACHED',
      });
      return;
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      ...parse.data,
      userId,
    },
  });

  if (parse.data.cost) {
    await recordManualSpendDelta(campaign.id, parse.data.cost);
  }

  res.status(201).json({ campaign });
});

// GET /api/campaigns/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: { in: teamIds } },
    include: {
      links: {
        include: {
          _count: { select: { clicks: true, conversions: true } },
          conversions: { select: { value: true } },
        },
      },
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const totalClicks = await prisma.click.count({ where: { campaignId: id } });
  const conversions = campaign.links.flatMap((l) => l.conversions);
  const totalConversions = conversions.length;
  const revenue = conversions.reduce((s, c) => s + c.value, 0);
  const budget = campaign.budget ?? 0;
  const roas = budget > 0 && revenue > 0 ? revenue / budget : null;
  const ctr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  res.json({
    campaign: {
      ...campaign,
      links: campaign.links.map((l) => ({
        id: l.id,
        name: l.name,
        destinationUrl: l.destinationUrl,
        slug: l.slug,
        conversionToken: l.conversionToken,
        createdAt: l.createdAt,
        stats: {
          totalClicks: l._count.clicks,
          totalConversions: l._count.conversions,
          revenue: l.conversions.reduce((s, c) => s + c.value, 0),
        },
      })),
      stats: {
        totalClicks,
        totalConversions,
        revenue: Math.round(revenue * 100) / 100,
        roas: roas !== null ? Math.round(roas * 100) / 100 : null,
        ctr: Math.round(ctr * 100) / 100,
      },
    },
  });
});

// PATCH /api/campaigns/:id
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  budget: z.number().positive().optional(),
  cost: z.number().min(0).optional(),
  externalCampaignId: z.string().optional().nullable(),
  trafficSourceId: z.string().optional().nullable(),
  flowId: z.string().optional().nullable(),
  status: z.nativeEnum(CampaignStatus).optional(),
});

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const parse = updateCampaignSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const existing = await prisma.campaign.findFirst({ where: { id, userId: { in: teamIds } } });
  if (!existing) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: parse.data,
  });

  if (parse.data.cost !== undefined) {
    const delta = parse.data.cost - (existing.cost ?? 0);
    await recordManualSpendDelta(campaign.id, delta);
  }

  // Newly linked to a Meta campaign: pull its spend now instead of waiting
  // for the 6-hourly sync. Best effort — the link itself is already saved.
  let spendSynced = false;
  if (parse.data.externalCampaignId && parse.data.externalCampaignId !== existing.externalCampaignId) {
    const connections = await prisma.adAccountConnection.findMany({
      where: { userId: { in: teamIds }, platform: 'meta' },
      select: { id: true },
    });
    for (const conn of connections) {
      try {
        await syncMetaConnection(conn.id);
        spendSynced = true;
      } catch (err) {
        console.error('[campaigns] spend sync after linking failed', conn.id, err instanceof Error ? err.message : err);
      }
    }
  }

  const fresh = spendSynced ? await prisma.campaign.findUnique({ where: { id } }) : campaign;
  res.json({ campaign: fresh ?? campaign, spendSynced });
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const existing = await prisma.campaign.findFirst({ where: { id, userId: { in: teamIds } } });
  if (!existing) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  await prisma.campaign.delete({ where: { id } });

  res.json({ ok: true });
});

export default router;
