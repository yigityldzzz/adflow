import { Router, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
function nanoid(size = 21): string { return randomBytes(Math.ceil(size * 3 / 4)).toString('base64url').slice(0, size); }
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { limitFor } from '../config/planLimits';
import { getTeamUserIds } from '../services/team';

const router = Router();
router.use(authenticate);

// GET /api/links
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);

  const links = await prisma.trackingLink.findMany({
    where: { userId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { clicks: { where: { isBot: false } }, conversions: true } },
      conversions: { select: { value: true } },
      campaign: { select: { id: true, name: true } },
      domain: { select: { id: true, domain: true, live: true } },
    },
  });

  const result = links.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    destinationUrl: l.destinationUrl,
    conversionToken: l.conversionToken,
    campaignId: l.campaignId,
    campaign: l.campaign,
    domainId: l.domainId,
    domain: l.domain,
    createdAt: l.createdAt,
    trackingUrl: buildTrackingUrl(l.slug, l.domain),
    postbackUrl: buildPostbackUrl(l.conversionToken, l.domain),
    pixelUrl: buildPixelUrl(l.conversionToken, l.domain),
    stats: {
      totalClicks: l._count.clicks,
      totalConversions: l._count.conversions,
      revenue: Math.round(l.conversions.reduce((s, c) => s + c.value, 0) * 100) / 100,
    },
  }));

  res.json({ links: result });
});

// POST /api/links
const createLinkSchema = z.object({
  name: z.string().min(1).max(200),
  destinationUrl: z.string().url(),
  campaignId: z.string().optional(),
  domainId: z.string().optional().nullable(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createLinkSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { name, destinationUrl, campaignId, domainId } = parse.data;
  const userId = req.user!.id;

  const teamIds = await getTeamUserIds(userId);
  const limits = limitFor(req.user!.plan);
  if (limits.maxLinks !== null) {
    const linkCount = await prisma.trackingLink.count({ where: { userId: { in: teamIds } } });
    if (linkCount >= limits.maxLinks) {
      res.status(403).json({
        error: `Your plan is limited to ${limits.maxLinks} tracking link${limits.maxLinks === 1 ? '' : 's'}. Upgrade to Pro for unlimited links.`,
        code: 'PLAN_LIMIT_REACHED',
      });
      return;
    }
  }

  // Verify campaign belongs to the user's team if provided
  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId: { in: teamIds } } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
  }

  // Verify domain belongs to the user's team and is actually live before letting
  // links use it — otherwise the generated tracking URL wouldn't work yet.
  if (domainId) {
    const domain = await prisma.domain.findFirst({ where: { id: domainId, userId: { in: teamIds }, live: true } });
    if (!domain) {
      res.status(404).json({ error: 'Domain not found or not yet live' });
      return;
    }
  }

  // Generate a unique 8-char slug
  let slug: string;
  let attempts = 0;
  do {
    slug = nanoid(8);
    const exists = await prisma.trackingLink.findUnique({ where: { slug } });
    if (!exists) break;
    attempts++;
  } while (attempts < 5);

  const link = await prisma.trackingLink.create({
    data: {
      name,
      destinationUrl,
      campaignId: campaignId ?? null,
      domainId: domainId ?? null,
      userId,
      slug: slug!,
    },
    include: {
      campaign: { select: { id: true, name: true } },
      domain: { select: { id: true, domain: true, live: true } },
    },
  });

  res.status(201).json({
    link: {
      ...link,
      trackingUrl: buildTrackingUrl(link.slug, link.domain),
      postbackUrl: buildPostbackUrl(link.conversionToken, link.domain),
      pixelUrl: buildPixelUrl(link.conversionToken, link.domain),
    },
  });
});

// GET /api/links/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const link = await prisma.trackingLink.findFirst({
    where: { id, userId: { in: teamIds } },
    include: {
      _count: { select: { clicks: { where: { isBot: false } }, conversions: true } },
      conversions: { select: { value: true, type: true, timestamp: true } },
      campaign: { select: { id: true, name: true } },
      domain: { select: { id: true, domain: true, live: true } },
    },
  });

  if (!link) {
    res.status(404).json({ error: 'Link not found' });
    return;
  }

  const revenue = link.conversions.reduce((s, c) => s + c.value, 0);

  res.json({
    link: {
      id: link.id,
      name: link.name,
      slug: link.slug,
      destinationUrl: link.destinationUrl,
      conversionToken: link.conversionToken,
      campaignId: link.campaignId,
      campaign: link.campaign,
      domainId: link.domainId,
      domain: link.domain,
      createdAt: link.createdAt,
      trackingUrl: buildTrackingUrl(link.slug, link.domain),
      postbackUrl: buildPostbackUrl(link.conversionToken, link.domain),
      pixelUrl: buildPixelUrl(link.conversionToken, link.domain),
      stats: {
        totalClicks: link._count.clicks,
        totalConversions: link._count.conversions,
        revenue: Math.round(revenue * 100) / 100,
      },
    },
  });
});

// PATCH /api/links/:id
const updateLinkSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destinationUrl: z.string().url().optional(),
  campaignId: z.string().nullable().optional(),
  domainId: z.string().nullable().optional(),
});

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const parse = updateLinkSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const existing = await prisma.trackingLink.findFirst({ where: { id, userId: { in: teamIds } } });
  if (!existing) {
    res.status(404).json({ error: 'Link not found' });
    return;
  }

  if (parse.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: parse.data.campaignId, userId: { in: teamIds } },
    });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
  }

  if (parse.data.domainId) {
    const domain = await prisma.domain.findFirst({
      where: { id: parse.data.domainId, userId: { in: teamIds }, live: true },
    });
    if (!domain) {
      res.status(404).json({ error: 'Domain not found or not yet live' });
      return;
    }
  }

  const link = await prisma.trackingLink.update({
    where: { id },
    data: parse.data,
    include: { domain: { select: { id: true, domain: true, live: true } } },
  });

  res.json({
    link: {
      ...link,
      trackingUrl: buildTrackingUrl(link.slug, link.domain),
      postbackUrl: buildPostbackUrl(link.conversionToken, link.domain),
      pixelUrl: buildPixelUrl(link.conversionToken, link.domain),
    },
  });
});

// GET /api/links/:id/clicks
router.get('/:id/clicks', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const offset = parseInt(String(req.query.offset ?? '0'), 10);

  const link = await prisma.trackingLink.findFirst({ where: { id, userId: { in: teamIds } } });
  if (!link) { res.status(404).json({ error: 'Link not found' }); return; }

  const filterBot = req.query.filter === 'bot' ? true : req.query.filter === 'human' ? false : undefined;
  const clickWhere = { linkId: id, ...(filterBot !== undefined ? { isBot: filterBot } : {}) };

  const [clicks, total, humanCount, botCount, convertedCount, uniqueResult] = await Promise.all([
    prisma.click.findMany({
      where: clickWhere,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        conversions: { select: { id: true, type: true, value: true, currency: true } },
      },
    }),
    prisma.click.count({ where: clickWhere }),
    prisma.click.count({ where: { linkId: id, isBot: false } }),
    prisma.click.count({ where: { linkId: id, isBot: true } }),
    prisma.click.count({ where: { linkId: id, conversions: { some: {} } } }),
    prisma.click.groupBy({
      by: ['visitorId'],
      where: { linkId: id, isBot: false },
    }),
  ]);

  const uniqueCount = uniqueResult.length;
  res.json({ clicks, total, humanCount, botCount, convertedCount, uniqueCount, limit, offset, link });
});

// DELETE /api/links/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const teamIds = await getTeamUserIds(req.user!.id);

  const existing = await prisma.trackingLink.findFirst({ where: { id, userId: { in: teamIds } } });
  if (!existing) {
    res.status(404).json({ error: 'Link not found' });
    return;
  }

  await prisma.trackingLink.delete({ where: { id } });

  res.json({ ok: true });
});

type LinkDomain = { domain: string; live: boolean } | null | undefined;

// Uses the link's own custom domain once it's actually live (routing
// confirmed on the server side, not just DNS-verified) — otherwise falls
// back to the default AdFlow domain so links always work.
function resolveBase(domain: LinkDomain): string {
  if (domain?.live) return `https://${domain.domain}`;
  return process.env.BASE_URL ?? 'https://adflow.digitaladexpert.de';
}

function buildTrackingUrl(slug: string, domain?: LinkDomain): string {
  return `${resolveBase(domain)}/r/${slug}`;
}

function buildPostbackUrl(token: string, domain?: LinkDomain): string {
  return `${resolveBase(domain)}/api/conversions/postback?token=${token}&value={VALUE}&sub1={VISITOR_ID}&txid={TRANSACTION_ID}`;
}

function buildPixelUrl(token: string, domain?: LinkDomain): string {
  return `${resolveBase(domain)}/api/conversions/pixel/${token}.gif`;
}

export default router;
