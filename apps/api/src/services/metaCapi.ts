import crypto from 'crypto';

export interface CapiEventPayload {
  pixelId: string;
  accessToken: string;
  eventName: string;       // 'Purchase' | 'Lead' | 'CompleteRegistration' etc.
  eventId: string;         // unique ID for deduplication with browser pixel
  eventTime: number;       // unix timestamp (seconds)
  fbclid?: string | null;
  clickTimestamp?: Date;   // when the original click happened (for fbc)
  ip?: string | null;
  userAgent?: string | null;
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  // Already SHA-256-hashed (normalized) email / phone, hashed in the visitor's
  // browser — AdFlow never receives the plain values.
  emailHash?: string | null;
  phoneHash?: string | null;
  // Our own visitor id (adflow_vid); hashed here and sent as external_id so
  // Meta can tie a visitor's events (engaged visit, lead) to one person.
  externalId?: string | null;
  // Meta Events Manager "Test events" code — events show up there only.
  testEventCode?: string;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

// Accepts a pre-hashed value only (64 lowercase hex chars); anything else is dropped.
export function cleanHash(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return SHA256_HEX.test(v) ? v : null;
}

export interface CapiResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function buildFbc(fbclid: string, clickTime?: Date): string {
  // fbc format: fb.{version}.{creation_time_ms}.{fbclid}
  const ts = clickTime ? clickTime.getTime() : Date.now();
  return `fb.1.${ts}.${fbclid}`;
}

export async function sendMetaCapiEvent(payload: CapiEventPayload): Promise<CapiResult> {
  const {
    pixelId,
    accessToken,
    eventName,
    eventId,
    eventTime,
    fbclid,
    clickTimestamp,
    ip,
    userAgent,
    value,
    currency,
    eventSourceUrl,
    emailHash,
    phoneHash,
    externalId,
    testEventCode,
  } = payload;

  // Build user_data object
  const userData: Record<string, string | string[]> = {};

  if (fbclid) {
    userData['fbc'] = buildFbc(fbclid, clickTimestamp);
  }

  // Meta spec: client_ip_address and client_user_agent are NOT hashed — sent as plain text
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('::')) {
    userData['client_ip_address'] = ip;
  }
  if (userAgent) {
    userData['client_user_agent'] = userAgent;
  }

  // Hashed identifiers (Meta spec: arrays of SHA-256 hex strings)
  const em = cleanHash(emailHash);
  const ph = cleanHash(phoneHash);
  if (em) userData['em'] = [em];
  if (ph) userData['ph'] = [ph];
  if (externalId) userData['external_id'] = [sha256(externalId)];

  // Build event object
  const eventObj: Record<string, unknown> = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: 'website',
    user_data: userData,
  };

  if (eventSourceUrl) {
    eventObj['event_source_url'] = eventSourceUrl;
  }

  if (value !== undefined && value > 0) {
    eventObj['custom_data'] = {
      value: value,
      currency: currency || 'USD',
    };
  }

  const body = JSON.stringify({ data: [eventObj], ...(testEventCode ? { test_event_code: testEventCode } : {}) });

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(8000),
    });

    const result = (await resp.json()) as Record<string, unknown>;

    if (result['error']) {
      const err = result['error'] as Record<string, unknown>;
      return { success: false, error: String(err['message'] ?? 'Meta CAPI error') };
    }

    return { success: true, eventId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
