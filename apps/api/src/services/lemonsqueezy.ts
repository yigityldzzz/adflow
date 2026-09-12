import crypto from 'crypto';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

function getApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error('LEMONSQUEEZY_API_KEY not configured');
  return key;
}

function getStoreId(): string {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMONSQUEEZY_STORE_ID not configured');
  return id;
}

// Maps a Lemon Squeezy variant id to our internal Plan enum value. Kept as a
// function (not a module-level constant) so it always reads the current
// process.env instead of whatever was set at import time.
export function planForVariant(variantId: string): 'PRO' | 'TEAM' | null {
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_PRO) return 'PRO';
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_TEAM) return 'TEAM';
  return null;
}

export async function createCheckoutUrl(params: {
  variantId: string;
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: params.email,
            name: params.name ?? undefined,
            custom: { user_id: params.userId },
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: getStoreId() } },
          variant: { data: { type: 'variants', id: params.variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout creation failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}

// Lemon Squeezy signs each webhook body with HMAC-SHA256 using the signing
// secret configured for that webhook endpoint, sent in the X-Signature header.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(signatureHeader, 'utf8');

  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}
