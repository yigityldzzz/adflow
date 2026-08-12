// Snapchat Conversions API (v3) — server-side conversion tracking.
// Docs: POST https://tr.snapchat.com/v3/{pixel_id}/events?access_token={token}
// em/ph in user_data must be SHA-256 hashed if used; we only send
// client_ip_address / client_user_agent / sc_click_id, which are sent plain.

import crypto from 'crypto';

export interface SnapEventPayload {
  pixelId: string;
  accessToken: string;
  eventName: string;   // Snap standard events are upper snake case, e.g. 'PURCHASE', 'SIGN_UP'
  eventId: string;
  eventTime: number;   // unix seconds
  sccid?: string | null;
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

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendSnapEvent(payload: SnapEventPayload): Promise<CapiResult> {
  const { pixelId, accessToken, eventName, eventId, eventTime, sccid, ip, userAgent, value, currency, eventSourceUrl } = payload;

  const userData: Record<string, string> = {};
  if (sccid) userData['sc_click_id'] = sccid;
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('::')) userData['client_ip_address'] = ip;
  if (userAgent) userData['client_user_agent'] = userAgent;

  const eventObj: Record<string, unknown> = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: 'WEB',
    user_data: userData,
  };
  if (eventSourceUrl) eventObj['event_source_url'] = eventSourceUrl;
  if (value !== undefined && value > 0) {
    eventObj['custom_data'] = { currency: currency || 'USD', value: String(value) };
  }

  const url = `https://tr.snapchat.com/v3/${pixelId}/events?access_token=${accessToken}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventObj] }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok || result['error']) {
      return { success: false, error: String(result['error'] ?? result['message'] ?? `Snapchat API error (${resp.status})`) };
    }
    return { success: true, eventId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// exported for future use if we ever need to hash PII (em/ph); not currently
// used since we only send device signals, not personal identifiers.
export { sha256 as hashForSnap };
