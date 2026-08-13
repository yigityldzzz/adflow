import { Router, Response } from 'express';
import { z } from 'zod';
import dns from 'dns';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getTeamUserIds } from '../services/team';

const router = Router();
router.use(authenticate);

const resolveTxt = dns.promises.resolveTxt;

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const createSchema = z.object({
  domain: z.string().min(3).max(253).regex(DOMAIN_REGEX, 'Enter a valid domain, e.g. track.yourcompany.com'),
});

// GET /api/domains
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const domains = await prisma.domain.findMany({
    where: { userId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ domains });
});

// POST /api/domains
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const domain = parse.data.domain.toLowerCase().trim();
  const existing = await prisma.domain.findUnique({ where: { domain } });
  if (existing) {
    res.status(409).json({ error: 'This domain is already registered' });
    return;
  }

  const created = await prisma.domain.create({
    data: { userId: req.user!.id, domain },
  });

  res.status(201).json({
    domain: created,
    dnsInstructions: {
      verification: {
        type: 'TXT',
        host: `_adflow-verify.${domain}`,
        value: created.verificationToken,
      },
      routing: {
        type: 'CNAME',
        host: domain,
        value: 'adflow.digitaladexpert.de',
        note: 'Use Cloudflare with the orange-cloud proxy enabled so SSL is handled automatically. After DNS verification, this domain still needs one manual activation step on our end before it starts serving traffic — we will notify you.',
      },
    },
  });
});

// POST /api/domains/:id/verify — checks the TXT record right now
router.post('/:id/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const domain = await prisma.domain.findFirst({ where: { id: req.params.id, userId: { in: teamIds } } });
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }
  if (domain.verified) {
    res.json({ domain, verified: true });
    return;
  }

  try {
    const records = await resolveTxt(`_adflow-verify.${domain.domain}`);
    const flat = records.map((r) => r.join(''));
    const found = flat.includes(domain.verificationToken);

    if (!found) {
      res.status(400).json({
        error: 'TXT record not found yet. DNS changes can take up to a few hours to propagate.',
        verified: false,
        seen: flat,
      });
      return;
    }

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: { verified: true, verifiedAt: new Date() },
    });
    res.json({ domain: updated, verified: true });
  } catch {
    res.status(400).json({
      error: 'Could not find a TXT record for this domain yet. DNS changes can take up to a few hours to propagate.',
      verified: false,
    });
  }
});

// DELETE /api/domains/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const domain = await prisma.domain.findFirst({ where: { id: req.params.id, userId: { in: teamIds } } });
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }
  await prisma.domain.delete({ where: { id: domain.id } });
  res.json({ ok: true });
});

export default router;
