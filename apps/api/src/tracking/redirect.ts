import { Router, Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import { prisma } from '../config/database';
import { detectBot } from '../services/botDetection';
import { lookupGeo } from '../services/geoip';
import { randomBytes } from 'crypto';
function nanoid(size = 21) { return randomBytes(Math.ceil(size * 3/4)).toString('base64url').slice(0, size); }

const router = Router();
const VISITOR_COOKIE = 'adflow_vid';
const VISITOR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
  'fbclid','gclid','ttclid','sccid','ScCid','ref','referrer',
  'clickid','click_id','subid','sub_id','cid',
]);

// Common query-param names traffic networks use to pass their own click
// identifier into our tracking link. We store whichever one is present so it
// can be echoed back verbatim in outbound postbacks to that network later.
const EXTERNAL_CLICKID_PARAMS = ['clickid', 'click_id', 'subid', 'sub_id', 'cid'];

function getRealIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (cf && typeof cf === 'string') return cf.trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = (Array.isArray(xff) ? xff[0] : xff).split(',')[0];
    if (first) return first.trim();
  }
  return req.ip ?? '127.0.0.1';
}

function appendParams(base: string, extra: Record<string, string>): string {
  try {
    const url = new URL(base);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return url.toString();
  } catch { return base; }
}

function buildDestinationUrl(base: string, incomingQuery: Record<string, string>): string {
  try {
    const url = new URL(base);
    for (const [key, value] of Object.entries(incomingQuery)) {
      if (!TRACKING_PARAMS.has(key) && key !== 'slug') {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch { return base; }
}

interface FlowConditionCheck {
  condition: 'country' | 'device' | 'os' | 'language';
  operator: 'is' | 'is_not' | 'contains';
  value: string;
}

interface FlowRule {
  // New format — multiple conditions combined with AND logic (all must match).
  conditions?: FlowConditionCheck[];
  // Legacy format — single condition. Kept for backward compatibility with
  // flows created before multi-condition support was added.
  condition?: 'country' | 'device' | 'os' | 'language' | 'always';
  operator?: 'is' | 'is_not' | 'contains';
  value?: string;
  landerId?: string;
  offerId?: string;
}

interface FlowPath {
  weight: number;   // 1-100
  landerId?: string;
  offerId?: string;
}

function pickWeightedPath(paths: FlowPath[]): FlowPath | null {
  const total = paths.reduce((s, p) => s + (p.weight ?? 1), 0);
  if (total <= 0) return paths[0] ?? null;
  let rand = Math.random() * total;
  for (const path of paths) {
    rand -= path.weight ?? 1;
    if (rand <= 0) return path;
  }
  return paths[paths.length - 1] ?? null;
}

function checkCondition(actual: string, operator: 'is' | 'is_not' | 'contains', value: string): boolean {
  const a = actual.toLowerCase();
  const v = (value ?? '').toLowerCase();
  if (operator === 'contains') return a.includes(v);
  const isEqual = a === v;
  return operator === 'is_not' ? !isEqual : isEqual;
}

function matchRule(rule: FlowRule, ctx: { country: string; device: string; os: string; language: string }): boolean {
  // New format: every condition in the list must match (AND logic).
  if (rule.conditions && rule.conditions.length > 0) {
    return rule.conditions.every((c) => checkCondition(ctx[c.condition] ?? '', c.operator, c.value));
  }
  // Legacy format: single condition.
  if (!rule.condition || rule.condition === 'always') return true;
  return checkCondition(ctx[rule.condition] ?? '', rule.operator ?? 'is', rule.value ?? '');
}

async function resolveFlowDestination(
  flowId: string,
  ctx: { country: string; device: string; os: string; language: string },
  passParams: Record<string, string>,
): Promise<string | null> {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } });
  if (!flow) return null;

  const rules: FlowRule[] = Array.isArray(flow.rules) ? (flow.rules as unknown as FlowRule[]) : [];

  // Find first matching rule
  let landerId: string | null = null;
  let offerId: string | null = null;

  for (const rule of rules) {
    if (matchRule(rule, ctx)) {
      landerId = rule.landerId ?? flow.landerId ?? null;
      offerId = rule.offerId ?? flow.offerId ?? null;
      break;
    }
  }

  // Fallback: try weighted A/B paths first, then flow defaults
  if (!landerId && !offerId) {
    const paths: FlowPath[] = Array.isArray((flow as Record<string, unknown>).paths)
      ? ((flow as Record<string, unknown>).paths as unknown as FlowPath[])
      : [];

    if (paths.length > 0) {
      const picked = pickWeightedPath(paths);
      if (picked) {
        landerId = picked.landerId ?? null;
        offerId  = picked.offerId  ?? null;
      }
    } else {
      landerId = flow.landerId ?? null;
      offerId  = flow.offerId  ?? null;
    }
  }

  // Prefer Lander (user will continue to Offer via LP script)
  if (landerId) {
    const lander = await prisma.lander.findUnique({ where: { id: landerId } });
    if (lander?.url) return appendParams(lander.url, passParams);
  }
  if (offerId) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (offer?.url) return appendParams(offer.url, passParams);
  }

  return null;
}

// GET /r/:slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const link = await prisma.trackingLink.findUnique({
    where: { slug },
    include: {
      campaign: { select: { id: true, flowId: true, status: true } },
    },
  });

  if (!link) { res.status(404).send('Not found'); return; }

  const ip = getRealIp(req);
  const userAgentString = req.headers['user-agent'] ?? '';
  const parser = new UAParser(userAgentString);
  const ua = parser.getResult();

  const browser = ua.browser.name ?? null;
  const browserVersion = ua.browser.version ?? null;
  const os = ua.os.name ?? null;
  const deviceType = ua.device.type ?? 'desktop';
  const { isBot, isSuspicious } = detectBot(userAgentString, ip);
  const geo = lookupGeo(ip);

  let visitorId: string = req.cookies?.[VISITOR_COOKIE] ?? '';
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = nanoid(16);

  const q = req.query as Record<string, string>;
  const utmSource   = q['utm_source']   ?? null;
  const utmMedium   = q['utm_medium']   ?? null;
  const utmCampaign = q['utm_campaign'] ?? null;
  const utmContent  = q['utm_content']  ?? null;
  const utmTerm     = q['utm_term']     ?? null;
  const fbclid      = q['fbclid']       ?? null;
  const gclid       = q['gclid']        ?? null;
  const ttclid      = q['ttclid']       ?? null;
  const sccid       = q['sccid']        ?? q['ScCid'] ?? null; // Snapchat click id — network-dependent casing
  const referrer    = req.headers['referer'] ?? q['referrer'] ?? null;
  const language    = req.headers['accept-language']?.split(',')[0] ?? null;

  // Capture the traffic network's own click id, if it passed one, so we can
  // echo it back verbatim in outbound postbacks to that network.
  let externalClickId: string | null = null;
  for (const key of EXTERNAL_CLICKID_PARAMS) {
    if (q[key]) { externalClickId = q[key]; break; }
  }

  // Pass-through params for Lander/Offer URLs
  const passParams: Record<string, string> = { adflow_vid: visitorId };
  if (fbclid) passParams['fbclid'] = fbclid;
  if (gclid)  passParams['gclid']  = gclid;
  if (ttclid) passParams['ttclid'] = ttclid;
  if (sccid)  passParams['sccid']  = sccid;
  if (externalClickId) passParams['clickid'] = externalClickId;

  // ── Bot handling ─────────────────────────────────────────────────────────
  // Known bots (UA pattern or known bad IP range) are never forwarded to the
  // real offer/lander — this protects ad spend and offer-side reputation.
  // We still log the click (marked isBot: true) so it shows up in reporting.
  // 'Suspicious' clicks (weaker signal, e.g. missing UA) are still forwarded —
  // blocking on a weak signal risks turning away real visitors.
  if (isBot) {
    res.status(200).type('text/plain').send('');

    prisma.click.create({
      data: {
        linkId: link.id,
        campaignId: link.campaignId ?? null,
        userId: link.userId,
        visitorId,
        utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
        fbclid, gclid, ttclid, sccid, externalClickId,
        ip,
        country:      geo.country      ?? null,
        countryCode:  geo.countryCode  ?? null,
        city:         geo.city         ?? null,
        region:       geo.region       ?? null,
        browser, browserVersion, os,
        device:   deviceType,
        language, referrer: referrer ?? null,
        userAgent: userAgentString || null,
        isBot: true, isSuspicious, isUnique: false,
      },
    }).catch(() => {});
    return;
  }

  // ── Paused-campaign handling ────────────────────────────────────────────
  // A campaign can be paused manually or automatically (via an alert action).
  // While paused we stop forwarding clicks to the real offer/lander — but we
  // still log the click (so it's visible in reporting) rather than silently
  // dropping it.
  if (link.campaign?.status === 'PAUSED') {
    res.status(200).type('text/plain').send('');

    prisma.click.create({
      data: {
        linkId: link.id,
        campaignId: link.campaignId ?? null,
        userId: link.userId,
        visitorId,
        utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
        fbclid, gclid, ttclid, sccid, externalClickId,
        ip,
        country:      geo.country      ?? null,
        countryCode:  geo.countryCode  ?? null,
        city:         geo.city         ?? null,
        region:       geo.region       ?? null,
        browser, browserVersion, os,
        device:   deviceType,
        language, referrer: referrer ?? null,
        userAgent: userAgentString || null,
        isBot: false, isSuspicious, isUnique: false,
      },
    }).catch(() => {});
    return;
  }

  // ── Resolve destination ──────────────────────────────────────────────────
  let destinationUrl = buildDestinationUrl(link.destinationUrl, q);

  const flowId = link.campaign?.flowId ?? null;
  if (flowId) {
    const ctx = {
      country:  (geo.countryCode ?? '').toUpperCase(),
      device:   deviceType,
      os:       os ?? '',
      language: language ?? '',
    };
    const flowDest = await resolveFlowDestination(flowId, ctx, passParams);
    if (flowDest) destinationUrl = flowDest;
  } else if (!flowId) {
    // Even without a flow, append visitorId to destination so LP script picks it up
    destinationUrl = appendParams(destinationUrl, passParams);
  }

  // Set visitor cookie before redirect
  if (isNewVisitor) {
    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: VISITOR_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  res.redirect(302, destinationUrl);

  // Async DB write
  // Check uniqueness: has this visitor already clicked this link in the last 24h?
  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingClick = await prisma.click.findFirst({
    where: { linkId: link.id, visitorId, timestamp: { gte: ago24h } },
    select: { id: true },
  }).catch(() => null);
  const isUnique = !existingClick;

  prisma.click.create({
    data: {
      linkId: link.id,
      campaignId: link.campaignId ?? null,
      userId: link.userId,
      visitorId,
      utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
      fbclid, gclid, ttclid, sccid, externalClickId,
      ip,
      country:      geo.country      ?? null,
      countryCode:  geo.countryCode  ?? null,
      city:         geo.city         ?? null,
      region:       geo.region       ?? null,
      browser, browserVersion, os,
      device:   deviceType,
      language, referrer: referrer ?? null,
      userAgent: userAgentString || null,
      isBot, isSuspicious, isUnique,
    },
  }).catch(() => {});
});

export default router;
