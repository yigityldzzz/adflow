// TikTok Events API (v1.3) — server-side conversion tracking.
// Docs: POST https://business-api.tiktok.com/open_api/v1.3/event/track/
// Auth via Access-Token header (long-lived token generated in Events Manager
// under the pixel's "Set up Events API" flow).

export interface TikTokEventPayload {
  pixelId: string;       // TikTok calls this event_source_id
  accessToken: string;
  eventName: string;     // e.g. 'CompletePayment', 'SubmitForm', 'CompleteRegistration'
  eventId: string;       // dedup id
  eventTime: number;     // unix seconds
  ttclid?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
}

export interface CapiResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export async function sendTikTokEvent(payload: TikTokEventPayload): Promise<CapiResult> {
  const { pixelId, accessToken, eventName, eventId, eventTime, ttclid, ip, userAgent, value, currency, eventSourceUrl } = payload;

  const user: Record<string, string> = {};
  if (ttclid) user['ttclid'] = ttclid;
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('::')) user['ip'] = ip;
  if (userAgent) user['user_agent'] = userAgent;

  const properties: Record<string, unknown> = {};
  if (value !== undefined && value > 0) {
    properties['value'] = value;
    properties['currency'] = currency || 'USD';
  }

  const eventObj: Record<string, unknown> = {
    event: eventName,
    event_time: eventTime,
    event_id: eventId,
    user,
    properties,
  };
  if (eventSourceUrl) eventObj['page'] = { url: eventSourceUrl };

  const body = JSON.stringify({
    event_source: 'web',
    event_source_id: pixelId,
    data: [eventObj],
  });

  try {
    const resp = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const result = (await resp.json()) as Record<string, unknown>;
    const code = result['code'];
    if (code !== 0) {
      return { success: false, error: String(result['message'] ?? `TikTok API error (code ${code})`) };
    }
    return { success: true, eventId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
