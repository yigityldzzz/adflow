import { prisma } from '../config/database';

// Click-quality rules that need more than one request to see. They run after
// a click is stored:
// - Burst: 3+ hits on the same link from the same IP within 10 seconds. People
//   don't click an ad that fast; scanners and prefetchers do.
// - Bot companion: a browser-looking hit from the same IP as a bot hit on the
//   same link within 60 seconds. Link checkers often send one request with a
//   bot user agent and another that looks like a phone.
// Matching hits are re-marked isBot so every report excludes them. The visitor
// was already redirected — this only changes how the click is counted.
export const BURST_WINDOW_MS = 10_000;
export const BURST_MIN_HITS = 3;
export const COMPANION_WINDOW_MS = 60_000;

export interface QualityHit {
  id: string;
  isBot: boolean;
  timestamp: Date;
}

// Ids of non-bot hits (all from one link + IP) that the rules mark as automated.
export function automatedHitIds(hits: QualityHit[]): string[] {
  const sorted = [...hits].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const flagged = new Set<string>();

  const botTimes = sorted.filter((h) => h.isBot).map((h) => h.timestamp.getTime());
  for (const h of sorted) {
    if (h.isBot) continue;
    const t = h.timestamp.getTime();
    if (botTimes.some((b) => Math.abs(b - t) <= COMPANION_WINDOW_MS)) flagged.add(h.id);
  }

  for (let i = 0, j = 0; j < sorted.length; j++) {
    while (sorted[j].timestamp.getTime() - sorted[i].timestamp.getTime() > BURST_WINDOW_MS) i++;
    if (j - i + 1 >= BURST_MIN_HITS) {
      for (let k = i; k <= j; k++) if (!sorted[k].isBot) flagged.add(sorted[k].id);
    }
  }
  return [...flagged];
}

export async function flagAutomatedNeighbours(linkId: string, ip: string | null, at: Date): Promise<void> {
  if (!ip) return;
  const hits = await prisma.click.findMany({
    where: {
      linkId,
      ip,
      timestamp: { gte: new Date(at.getTime() - COMPANION_WINDOW_MS), lte: new Date(at.getTime() + COMPANION_WINDOW_MS) },
    },
    select: { id: true, isBot: true, timestamp: true },
  });
  if (hits.length < 2) return;

  const ids = automatedHitIds(hits);
  if (ids.length === 0) return;
  await prisma.click.updateMany({ where: { id: { in: ids } }, data: { isBot: true, isUnique: false } });
}
