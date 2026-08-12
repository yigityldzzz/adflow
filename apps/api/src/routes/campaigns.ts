import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CampaignStatus } from '@prisma/client';
import { limitFor } from '../config/planLimits';
import { getTeamUserIds } from '../services/team';

const router = Router();
router.use(authenticate);

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
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createCampaignSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const userId = req.user!.id;
  const limits = limitFor(req.user!.plan);
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

  res.json({ campaign });
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
