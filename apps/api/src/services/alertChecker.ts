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

export async function checkAllAlerts(): Promise<void> {
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all enabled alerts grouped by user
  const alerts = await prisma.alert.findMany({ where: { enabled: true } });
  if (alerts.length === 0) return;

  // Get unique userIds
  const userIds = [...new Set(alerts.map((a) => a.userId))];

  for (const userId of userIds) {
    const userAlerts = alerts.filter((a) => a.userId === userId);

    const [clicks24h, botClicks24h, conversions24h, conversionValues24h] = await Promise.all([
      prisma.click.count({ where: { userId, timestamp: { gte: ago24h } } }),
      prisma.click.count({ where: { userId, isBot: true, timestamp: { gte: ago24h } } }),
      prisma.conversion.count({ where: { userId, timestamp: { gte: ago24h } } }),
      prisma.conversion.findMany({ where: { userId, timestamp: { gte: ago24h } }, select: { value: true } }),
    ]);

    const revenue24h = conversionValues24h.reduce((s, c) => s + c.value, 0);
    const botRate = clicks24h > 0 ? (botClicks24h / clicks24h) * 100 : 0;
    const totalSpend = await prisma.campaign.aggregate({ where: { userId }, _sum: { cost: true } }).then((r) => r._sum.cost ?? 0);
    const cpa = conversions24h > 0 && totalSpend > 0 ? totalSpend / conversions24h : 0;

    const currentValues: Record<string, number> = {
      clicks: clicks24h,
      conversions: conversions24h,
      revenue: revenue24h,
      bot_rate: botRate,
      cpa,
    };

    for (const alert of userAlerts) {
      const current = currentValues[alert.metric] ?? 0;
      const nowTriggered = alert.condition === 'above' ? current > alert.threshold : current < alert.threshold;
      const wasTriggered = alert.triggered;

      await prisma.alert.update({
        where: { id: alert.id },
        data: { triggered: nowTriggered, lastChecked: now },
      });

      // Fire webhook only on state change: not-triggered → triggered
      if (nowTriggered && !wasTriggered && alert.webhookUrl) {
        await fireWebhook(alert.webhookUrl, {
          alert: {
            id: alert.id,
            name: alert.name,
            metric: alert.metric,
            condition: alert.condition,
            threshold: alert.threshold,
            currentValue: current,
          },
          triggeredAt: now.toISOString(),
        });
      }
    }
  }
}
