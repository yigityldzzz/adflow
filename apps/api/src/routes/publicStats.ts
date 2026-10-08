import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { detectBot } from '../services/botDetection';

const router = Router();

// Only our own marketing site may report (checked against Origin/Referer).
const ALLOWED_HOSTS = new Set(['digitaladexpert.de', 'www.digitaladexpert.de']);
const EVENTS = new Set(['shown', 'granted', 'denied']);
const SOURCES = new Set(['meta', 'google', 'other', 'none']);
const DEVICES = new Set(['mobile', 'desktop']);
const PATH_RE = /^\/[a-z0-9/_-]{0,100}$/;

function fromOurSite(req: Request): boolean {
  const ref = req.headers.origin || req.headers.referer;
  if (typeof ref !== 'string') return false;
  try {
    return ALLOWED_HOSTS.has(new URL(ref).hostname);
  } catch {
    return false;
  }
}

// GET /api/public/consent-stat?e=shown|granted|denied&p=/tr/qr-menu&s=meta&d=mobile
// Increments one anonymous daily counter. Always answers 204.
router.get('/consent-stat', async (req: Request, res: Response): Promise<void> => {
  res.status(204).end();

  const event = String(req.query.e ?? '');
  const source = String(req.query.s ?? 'none');
  const device = String(req.query.d ?? '');
  const path = String(req.query.p ?? '').toLowerCase().replace(/\.html$/, '');
  if (!EVENTS.has(event) || !SOURCES.has(source) || !DEVICES.has(device) || !PATH_RE.test(path) || !fromOurSite(req)) return;
  // Search-engine and ad crawlers render the page too; they are not visitors.
  if (detectBot(String(req.headers['user-agent'] ?? ''), '').isBot) return;

  try {
    await prisma.$executeRaw`
      INSERT INTO "ConsentStat" (id, day, path, event, source, device, count)
      VALUES (${randomUUID()}, (now() AT TIME ZONE 'UTC')::date, ${path}, ${event}, ${source}, ${device}, 1)
      ON CONFLICT (day, path, event, source, device) DO UPDATE SET count = "ConsentStat".count + 1`;
  } catch (err) {
    console.error('[consent-stat]', err instanceof Error ? err.message : err);
  }
});

export default router;
