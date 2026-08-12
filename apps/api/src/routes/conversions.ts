import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ConversionType } from '@prisma/client';
import { sendMetaCapiEvent } from '../services/metaCapi';
import { fireGenericPostback } from '../services/postback';

const router = Router();

const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');

const postbackSchema = z.object({
  token:     z.string().min(1),
  type:      z.string().optional().default('PURCHASE').transform(v => v.toUpperCase()).pipe(z.nativeEnum(ConversionType)),
  value:     z.string().optional().transform(v => {
               if (!v || v.startsWith('{') || v.startsWith('%7B')) return 0;
               const n = parseFloat(v); return isNaN(n) ? 0 : n;
             }).pipe(z.number().min(0)),
  amount:    z.string().optional().transform(v => {
               if (!v || v.startsWith('{') || v.startsWith('%7B')) return undefined;
               const n = parseFloat(v); return isNaN(n) ? undefined : n;
             }).optional(),
  currency:  z.string().optional().default('USD').transform(v => v.length === 3 ? v : 'USD'),
  visitorId: z.string().optional(),
  sub1:      z.string().optional(),   // visitorId passed from LP script
  fbclid:    z.string().optional(),
  txid:      z.string().optional(),   // transaction ID for deduplication
});

async function fireMetaCapi(conversionId: string, clickId: string | null, linkId: string, value: number, currency: string, eventName: string, txid?: string | null): Promise<void> {
  const link = await prisma.trackingLink.findUnique({
    where: { id: linkId },
    include: { campaign: { include: { trafficSource: true } } },
  });
  const ts = link?.campaign?.trafficSource;
  if (!ts || ts.platform !== 'meta' || !ts.pixelId || !ts.accessToken) return;

  let fbclid: string | null = null;
  let clickTime: Date | undefined;
  let ip: string | null = null;
  let userAgent: string | null = null;
  let refererUrl: string | null | undefined = null;

  if (clickId) {
    const click = await prisma.click.findUnique({
      where: { id: clickId },
      select: { fbclid: true, timestamp: true, ip: true, userAgent: true, referrer: true },
    });
    if (click) {
      fbclid = click.fbclid;
      clickTime = click.timestamp;
      ip = click.ip;
      userAgent = click.userAgent;
      refererUrl = click.referrer ?? null;
    }
  }

  if (!fbclid) return;

  // event_source_url: use destination URL of the tracking link (the offer/LP page)
  const eventSourceUrl = link.destinationUrl || refererUrl || undefined;

  const result = await sendMetaCapiEvent({
    pixelId: ts.pixelId,
    accessToken: ts.accessToken,
    eventName: ts.fbEventName || eventName,
    eventId: txid || conversionId,
    eventTime: Math.floor(Date.now() / 1000),
    fbclid, clickTimestamp: clickTime, ip, userAgent, value, currency,
    eventSourceUrl: eventSourceUrl ?? undefined,
  });

  if (!result.success) console.error('[CAPI]', result.error, conversionId);
  else console.log('[CAPI] OK', conversionId, fbclid);
}

// Fires an outbound postback to the traffic source's own postback URL (any
// platform), substituting {clickid}, {cost}, {country}, etc. This is separate
// from Meta CAPI — a traffic source can have either, both, or neither
// configured.
async function fireTrafficSourcePostback(
  conversionId: string,
  clickId: string | null,
  linkId: string,
  value: number
): Promise<void> {
  const link = await prisma.trackingLink.findUnique({
    where: { id: linkId },
    include: { campaign: { include: { trafficSource: true } } },
  });
  const ts = link?.campaign?.trafficSource;
  if (!ts?.postbackUrl) return;

  let click: { externalClickId: string | null; visitorId: string; ip: string | null; country: string | null; city: string | null; device: string | null; os: string | null; browser: string | null } | null = null;
  if (clickId) {
    click = await prisma.click.findUnique({
      where: { id: clickId },
      select: { externalClickId: true, visitorId: true, ip: true, country: true, city: true, device: true, os: true, browser: true },
    });
  }

  await fireGenericPostback(ts.postbackUrl, {
    clickId: click?.externalClickId || click?.visitorId || null,
    campaignId: link?.campaign?.id ?? null,
    campaignName: link?.campaign?.name ?? null,
    device: click?.device ?? null,
    os: click?.os ?? null,
    browser: click?.browser ?? null,
    country: click?.country ?? null,
    city: click?.city ?? null,
    ip: click?.ip ?? null,
    value,
  }).catch(() => {});

  console.log('[Postback] fired', conversionId, ts.name);
}

async function handlePostback(req: Request, res: Response): Promise<void> {
  const parse = postbackSchema.safeParse({ ...req.query, ...req.body });
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }

  const { token, type, currency } = parse.data;
  const value = parse.data.amount ?? parse.data.value;
  const visitorId = parse.data.sub1 || parse.data.visitorId;
  const txid = parse.data.txid || null;

  const link = await prisma.trackingLink.findUnique({ where: { conversionToken: token } });
  if (!link) { res.status(404).json({ error: 'Invalid token' }); return; }

  // ── Deduplication: if txid already recorded for this link, skip ──
  if (txid) {
    const existing = await prisma.conversion.findFirst({ where: { linkId: link.id, txid } });
    if (existing) {
      res.json({ ok: true, duplicate: true, conversionId: existing.id });
      return;
    }
  }

  // ── Resolve click ──
  let clickId: string | null = null;
  let resolvedFbclid: string | null = parse.data.fbclid || null;

  if (visitorId) {
    const c = await prisma.click.findFirst({ where: { linkId: link.id, visitorId }, orderBy: { timestamp: 'desc' } });
    if (c) { clickId = c.id; resolvedFbclid = resolvedFbclid || c.fbclid; }
  }
  if (!clickId && resolvedFbclid) {
    const c = await prisma.click.findFirst({ where: { linkId: link.id, fbclid: resolvedFbclid }, orderBy: { timestamp: 'desc' } });
    if (c) clickId = c.id;
  }
  if (!clickId) {
    const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const c = await prisma.click.findFirst({ where: { linkId: link.id, timestamp: { gte: ago30 } }, orderBy: { timestamp: 'desc' } });
    if (c) { clickId = c.id; resolvedFbclid = resolvedFbclid || c.fbclid; }
  }

  const conversion = await prisma.conversion.create({
    data: { linkId: link.id, userId: link.userId, clickId, type, value, currency, txid },
  });

  res.json({ ok: true, conversionId: conversion.id });
  fireMetaCapi(conversion.id, clickId, link.id, value, currency, type, txid).catch(() => {});
  fireTrafficSourcePostback(conversion.id, clickId, link.id, value).catch(() => {});
}

router.get('/postback', handlePostback);
router.post('/postback', handlePostback);

// Pixel endpoint
router.get('/pixel/:token', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.params.token.replace(/\.gif$/, '');
  const type = (req.query.type as ConversionType | undefined) ?? 'PURCHASE';
  const value = req.query.value ? parseFloat(String(req.query.value)) : 0;
  const currency = String(req.query.currency ?? 'USD');
  const txid = req.query.txid ? String(req.query.txid) : null;
  const visitorId = req.query.sub1 ? String(req.query.sub1) : req.query.visitorId ? String(req.query.visitorId) : undefined;

  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache', Expires: '0' });
  res.end(TRANSPARENT_GIF);

  try {
    const link = await prisma.trackingLink.findUnique({ where: { conversionToken: rawToken } });
    if (!link) return;

    if (txid) {
      const dup = await prisma.conversion.findFirst({ where: { linkId: link.id, txid } });
      if (dup) return;
    }

    let clickId: string | null = null;
    if (visitorId) {
      const c = await prisma.click.findFirst({ where: { linkId: link.id, visitorId }, orderBy: { timestamp: 'desc' } });
      clickId = c?.id ?? null;
    } else {
      const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const c = await prisma.click.findFirst({ where: { linkId: link.id, timestamp: { gte: ago30 } }, orderBy: { timestamp: 'desc' } });
      clickId = c?.id ?? null;
    }

    const validType = Object.values(ConversionType).includes(type as ConversionType) ? (type as ConversionType) : ConversionType.PURCHASE;
    const conversion = await prisma.conversion.create({
      data: { linkId: link.id, userId: link.userId, clickId, type: validType, value: isNaN(value) ? 0 : value, currency, txid },
    });
    fireMetaCapi(conversion.id, clickId, link.id, value, currency, validType, txid).catch(() => {});
    fireTrafficSourcePostback(conversion.id, clickId, link.id, value).catch(() => {});
  } catch { /* pixel already sent */ }
});

// GET /api/conversions — auth
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId  = req.user!.id;
  const limit   = Math.min(parseInt(String(req.query.limit  ?? '50'), 10), 200);
  const offset  = Math.max(parseInt(String(req.query.offset ?? '0'),  10), 0);

  const campaignId = req.query.campaignId ? String(req.query.campaignId) : undefined;
  const type       = req.query.type       ? String(req.query.type)       : undefined;
  const search     = req.query.search     ? String(req.query.search)     : undefined;
  const preset     = String(req.query.preset ?? 'all');

  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (preset !== 'all') {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    if (preset === 'today')     dateFilter = { gte: today, lte: end };
    if (preset === 'yesterday') { const s = new Date(today); s.setDate(s.getDate()-1); const e = new Date(s); e.setHours(23,59,59,999); dateFilter = { gte: s, lte: e }; }
    if (preset === 'last7')     { const s = new Date(today); s.setDate(s.getDate()-6); dateFilter = { gte: s, lte: end }; }
    if (preset === 'last30')    { const s = new Date(today); s.setDate(s.getDate()-29); dateFilter = { gte: s, lte: end }; }
  }

  const where: Record<string, unknown> = {
    userId,
    ...(dateFilter   && { timestamp: dateFilter }),
    ...(type         && { type }),
    ...(campaignId   && { link: { campaignId } }),
    ...(search && { OR: [{ txid: { contains: search } }, { link: { name: { contains: search, mode: 'insensitive' } } }] }),
  };

  const [conversions, total, summary] = await Promise.all([
    prisma.conversion.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        link:  { select: { name: true, slug: true, campaignId: true, campaign: { select: { name: true } } } },
        click: { select: { country: true, countryCode: true, city: true, device: true, os: true, browser: true, utmSource: true, utmMedium: true, utmCampaign: true, fbclid: true, ip: true, visitorId: true } },
      },
    }),
    prisma.conversion.count({ where }),
    prisma.conversion.aggregate({ where, _sum: { value: true }, _count: { id: true }, _avg: { value: true } }),
  ]);

  res.json({
    conversions,
    total,
    limit,
    offset,
    summary: { revenue: summary._sum.value ?? 0, count: summary._count.id, avg: summary._avg.value ?? 0 },
  });
});

export default router;
