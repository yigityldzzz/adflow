import { prisma } from '../config/database';

async function fireWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error('[Alert webhook]', e);
  }
}

interface MetricSet {
  clicks: number;
  conversions: number;
  revenue: number;
  bot_rate: number;
  cpa: number;
}

async function computeMetrics(userId: string, campaignId: string | null, sinceMs: number): Promise<MetricSet> {
  const since = new Date(Date.now() - sinceMs);
  const clickWhere = campaignId ? { userId, campaignId, timestamp: { gte: since } } : { userId, timestamp: { gte: since } };
  const convWhere = campaignId
    ? { userId, timestamp: { gte: since }, click: { campaignId } }
    : { userId, timestamp: { gte: since } };

  const [clicks, botClicks, conversions, conversionValues, spend] = await Promise.all([
    prisma.click.count({ where: clickWhere }),
    prisma.click.count({ where: { ...clickWhere, isBot: true } }),
    prisma.conversion.count({ where: convWhere }),
    prisma.conversion.findMany({ where: convWhere, select: { value: true } }),
    campaignId
      ? prisma.campaign.findUnique({ where: { id: campaignId }, select: { cost: true } }).then((c) => c?.cost ?? 0)
      : prisma.campaign.aggregate({ where: { userId }, _sum: { cost: true } }).then((r) => r._sum.cost ?? 0),
  ]);

  const revenue = conversionValues.reduce((s, c) => s + c.value, 0);
  const botRate = clicks > 0 ? (botClicks / clicks) * 100 : 0;
  const cpa = conversions > 0 && spend > 0 ? spend / conversions : 0;

  return { clicks, conversions, revenue, bot_rate: botRate, cpa };
}

export async function checkAllAlerts(): Promise<void> {
  const now = new Date();
  const alerts = await prisma.alert.findMany({
    where: { enabled: true },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  });
  if (alerts.length === 0) return;

  for (const alert of alerts) {
    let current: number;
    try {
      const metrics = await computeMetrics(alert.userId, alert.campaignId, 24 * 60 * 60 * 1000);
      current = metrics[alert.metric as keyof MetricSet] ?? 0;
    } catch (e) {
      console.error('[AlertChecker] metric computation failed', alert.id, e);
      continue;
    }

    const nowTriggered = alert.condition === 'above' ? current > alert.threshold : current < alert.threshold;
    const wasTriggered = alert.triggered;

    await prisma.alert.update({
      where: { id: alert.id },
      data: { triggered: nowTriggered, lastChecked: now },
    });

    // Only act on the not-triggered → triggered transition, so we don't spam
    // webhooks/notifications/pauses on every 5-minute check while an alert
    // stays in a triggered state.
    if (nowTriggered && !wasTriggered) {
      const scopeLabel = alert.campaign ? ` (${alert.campaign.name})` : '';

      if (alert.webhookUrl) {
        await fireWebhook(alert.webhookUrl, {
          alert: {
            id: alert.id,
            name: alert.name,
            metric: alert.metric,
            condition: alert.condition,
            threshold: alert.threshold,
            currentValue: current,
            campaignId: alert.campaignId,
          },
          triggeredAt: now.toISOString(),
        });
      }

      await prisma.notification.create({
        data: {
          userId: alert.userId,
          type: 'alert_triggered',
          title: `Alert triggered: ${alert.name}${scopeLabel}`,
          message: `${alert.metric} is ${alert.condition === 'above' ? 'above' : 'below'} ${alert.threshold} (current: ${Math.round(current * 100) / 100}).`,
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
  }
}
